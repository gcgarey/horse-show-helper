# Part 1: Product Requirements
## RideTime — Version 1 Product Requirements
### Authentication
- As a user, I can create an account with email, phone number + password, or sign in with Apple/Google (need to collect a phone number) 
- As a user, my show selections, class entries, and warmup preferences persist across sessions and across days of a multi-day show
- As a user, I can log out
### Show Selection
- As a user, I am prompted to select my show on first launch or when no active show is saved
- Show data (name, dates, venue, classes, estimated start times) is pulled from ShowGroundsLive (SGL)
- As the system, once a user selects a show, I remember it for the duration of the show — the user does not need to re-select it each day
- As a user, I can manually change my active show at any time
- As the system, when a show's end date has passed, I clear the active show and prompt the user to select a new one
### Class Entry
- As a user, I can browse the classes available at my active show (sourced from SGL) and add the classes I am competing in
- As a user, I enter my ride position within each class (e.g. 4th to go)
- The system does not verify my position against the official entry list — I am trusted to know my own ride order
- As a user, I can edit or remove my class entries at any time
### Timing Engine
- As the system, I poll SGL's ClassStatus endpoint for each of the user's active classes during show hours
- The system uses the following default timing rules: 2 minutes per round, 20 minutes for a drag (ring maintenance break), 15 minutes for a course walk. These are configurable defaults — the architecture should support per-division or user-adjusted timing in a future version, even if that setting is not exposed in V1 UI
- As the system, I calculate: Estimated time until the user's round, Estimated time the user should mount (time to round minus warmup preference)
- As the system, I display both of these values clearly on the home screen for each entered class
### Manual Updates
- As a user, I can tap to advance the current horse count for my class (e.g. "that horse just went"), which immediately triggers a recalculation of my estimated times
This manual override takes precedence over the polled data until the next SGL update is received
- As a user, I can mark a class as complete if I have already shown

### Notifications
- As the system, I send a sms text notification when it is time for the user to mount, based on their calculated mount time
- As a user, I can enable or disable notifications per class

### Warmup Preference
- As a user, I set how many minutes I want between mounting and entering the arena (e.g. 20 minutes) This preference is saved to my account and applied to all classes by default
- As a user, I can override this preference per class

### Out of Scope for V1
- Position verification against official SGL entry lists
- Support for non-SGL venues
- Multi-horse or barn-level tracking
- Results or placings
- Trainer-facing views


# Part 2: Technical Design

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js (React) PWA  | Mobile-first web app; installable to home screen; one codebase for iOS + Android + desktop |
| Backend | Next.js API Routes | Co-located with frontend; minimal ops overhead |
| Database | Supabase (Postgres) | Managed Postgres + Auth + Realtime in one service |
| Auth | Supabase Auth | Built-in support for email/password, phone OTP, Google OAuth, Apple OAuth |
| Background Jobs | Vercel Cron + Edge Functions | SGL polling and notification dispatch without a separate server |
| SMS | Twilio | Reliable SMS delivery; simple REST API |
| Hosting | Vercel | Zero-config deploys for Next.js |

---

## Architecture Overview

```
┌─────────────────────────────────┐
│         Next.js Frontend        │
│  (PWA, React, Tailwind)         │
└──────────────┬──────────────────┘
               │ API calls (REST)
┌──────────────▼──────────────────┐
│       Next.js API Routes        │
│  /auth  /shows  /entries        │
│  /classes  /timing              │
└──────┬───────────────┬──────────┘
       │               │
┌──────▼──────┐  ┌─────▼──────────┐
│  Supabase   │  │  External APIs  │
│  Postgres   │  │  SGL ClassStatus│
│  Auth       │  │  Twilio SMS     │
│  Realtime   │  └────────────────┘
└─────────────┘

Background (Vercel Cron):
  • /api/cron/poll-sgl     — runs every 2 min during show hours
  • /api/cron/notify       — runs every 1 min, dispatches mount-time SMS
```

---

## Data Model

### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | Supabase Auth user id |
| phone | text | Required; used for SMS |
| warmup_minutes | int | Default 20; user-level preference |
| active_show_id | uuid FK → shows | NULL when no active show selected |
| created_at | timestamptz | |

### `shows`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| sgl_show_id | text | SGL's identifier |
| name | text | |
| venue | text | |
| start_date | date | |
| end_date | date | |
| timezone | text | IANA timezone (e.g. `America/New_York`) |

### `classes`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| show_id | uuid FK → shows | |
| sgl_class_id | text | SGL's identifier |
| name | text | e.g. "3'3" Junior Hunter" |
| division | text | e.g. "Junior Hunter" |
| ring | text | Ring name or number |
| estimated_start_time | timestamptz | From SGL; informational only |

### `user_entries`
The core table — one row per user per class they are competing in.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | |
| class_id | uuid FK → classes | |
| ride_position | int | User-supplied ordinal (1-based) |
| warmup_override_minutes | int | NULL = use user default |
| notifications_enabled | bool | Default true |
| manual_horse_count | int | NULL when not overridden |
| manual_count_set_at | timestamptz | Used to invalidate override on next poll |
| completed | bool | User marked "I've shown" |
| mount_notification_sent_at | timestamptz | Idempotency guard |
| created_at | timestamptz | |

### `class_status`
Live data synced from SGL, keyed by class. Separate from `classes` so SGL polling only touches this table.

| Column | Type | Notes |
|---|---|---|
| class_id | uuid PK FK → classes | |
| current_horse_number | int | Horses that have gone |
| status | enum | `not_started`, `in_progress`, `on_drag`, `course_walk`, `complete` |
| drag_started_at | timestamptz | Set when status → `on_drag`; used to estimate drag time remaining |
| course_walk_started_at | timestamptz | Same pattern for course walk |
| last_polled_at | timestamptz | |

### `timing_config` (singleton)
| Column | Type | Notes |
|---|---|---|
| id | int PK | Always 1 |
| minutes_per_round | numeric | Default 2.0 |
| drag_minutes | numeric | Default 20.0 |
| course_walk_minutes | numeric | Default 15.0 |

---

## SGL Integration

- SGL's `ClassStatus` endpoint is polled per-class, not per-user — one poll covers all users in that class.
- The cron job (`/api/cron/poll-sgl`) runs every 2 minutes during show hours (6 AM–7 PM local show time).
- It fetches the list of distinct `class_id`s with at least one non-completed `user_entry`, polls SGL for each, and upserts `class_status`.
- **Manual override logic**: if `manual_horse_count` is set on a `user_entry` and the new SGL `current_horse_number` is ≥ `manual_horse_count`, the manual override is cleared. This means the user's tap-to-advance is respected until SGL catches up.

---

## Timing Engine

The timing calculation is a pure function called on every data read (no stored "estimated time" column — always computed fresh):

```
function calculateTimes(entry, classStatus, config, now):
  effective_horse_count = entry.manual_horse_count ?? classStatus.current_horse_number
  horses_remaining      = max(0, entry.ride_position - effective_horse_count - 1)

  minutes_remaining = horses_remaining * config.minutes_per_round

  if classStatus.status == 'on_drag':
    elapsed = (now - classStatus.drag_started_at) in minutes
    minutes_remaining += max(0, config.drag_minutes - elapsed)

  if classStatus.status == 'course_walk':
    elapsed = (now - classStatus.course_walk_started_at) in minutes
    minutes_remaining += max(0, config.course_walk_minutes - elapsed)

  warmup = entry.warmup_override_minutes ?? user.warmup_minutes
  time_to_round  = now + minutes_remaining
  time_to_mount  = time_to_round - warmup

  return { time_to_round, time_to_mount, minutes_remaining }
```

This function lives in a shared utility module used by both the API and the notification cron.

---

## Notification System

The `/api/cron/notify` job runs every minute:

1. Queries all `user_entries` where `notifications_enabled = true`, `completed = false`, and `mount_notification_sent_at IS NULL`.
2. For each entry, runs `calculateTimes`.
3. If `time_to_mount` is within the next 2 minutes (a 2-minute window to account for cron skew), sends an SMS via Twilio and sets `mount_notification_sent_at = now`.

SMS message template:
> "Time to get on! Your round in [Class Name] is in ~[X] minutes. Good luck! — RideTime"

Twilio credentials are stored as environment variables (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`).

---

## API Routes

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account; phone required |
| GET | `/api/shows?search=` | Search SGL for shows by name/date |
| GET | `/api/shows/:id/classes` | List classes for a show |
| GET | `/api/user/active-show` | Return user's current active show |
| PUT | `/api/user/active-show` | Set or change active show |
| GET | `/api/user/entries` | All entries with computed timing |
| POST | `/api/user/entries` | Add a class entry |
| PATCH | `/api/user/entries/:id` | Edit position, warmup override, notifications |
| DELETE | `/api/user/entries/:id` | Remove entry |
| POST | `/api/user/entries/:id/advance` | Manual horse count tap (+1) |
| POST | `/api/user/entries/:id/complete` | Mark class as done |
| GET | `/api/user/profile` | Warmup preference and account info |
| PATCH | `/api/user/profile` | Update warmup preference |
| POST | `/api/cron/poll-sgl` | Internal; secured by cron secret header |
| POST | `/api/cron/notify` | Internal; secured by cron secret header |

---

## Frontend Structure

```
app/
  (auth)/
    login/         — email/password + OAuth buttons
    register/      — account creation with phone collection
  (app)/
    page.tsx       — Home: active entries with countdown timers
    show/
      select/      — Show search and selection
    classes/
      browse/      — Browse + add classes for active show
    settings/      — Warmup preference, account, logout
proxy.ts           — Auth guard; redirects unauthenticated users (Next.js 16: renamed from middleware.ts)
  
components/
  EntryCard        — Per-class card: time to round, time to mount, advance button
  CountdownTimer   — Live ticking display, refreshes every 30s from API
  ClassBrowser     — Searchable/filterable class list
```

The home screen polls `/api/user/entries` every 30 seconds for fresh timing data. Supabase Realtime can be added later for instant updates when `class_status` changes.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SGL_API_BASE_URL
SGL_API_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER
CRON_SECRET               — shared secret to authenticate cron job calls
```

---

## Key Technical Decisions & Tradeoffs

**Why PWA over native app?** Fastest path to both iOS and Android. Horse show riders can add it to their home screen. Push notifications are handled via SMS (Twilio) rather than native push, which sidesteps Apple's push certificate requirements for V1.

**Why server-side polling instead of client-side?** Polls SGL once per class regardless of how many users are in that class, which is more efficient and avoids hitting SGL rate limits. It also means timing data updates even when the user's phone is locked.

**Why compute timing on read rather than store it?** Avoids a stale-data problem. Any change to `class_status`, `user_entries`, or `timing_config` is automatically reflected in the next read without needing to re-derive and update stored columns.

**Why a 2-minute notification window?** Vercel Cron has no sub-minute resolution. A 2-minute window ensures the notification fires on the first cron tick after `time_to_mount` becomes imminent, without double-firing (guarded by `mount_notification_sent_at`).