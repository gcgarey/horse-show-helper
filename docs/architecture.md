# Architecture

## System Overview

RideTime is a Next.js 16 PWA deployed on Vercel. All backend logic lives in Next.js API Route Handlers co-located with the frontend. Supabase provides the database, auth, and (optionally in future) realtime subscriptions. External services are SGL (ShowGroundsLive) for live class data and Twilio for SMS.

```
Browser (PWA)
  └── Next.js App (Vercel)
        ├── React Server Components  — reads data server-side, no round-trip
        ├── 'use client' components  — forms, countdown timers, interactive UI
        ├── API Route Handlers       — REST endpoints for all data mutations
        ├── proxy.ts                 — auth guard, session refresh
        └── Vercel Cron Jobs
              ├── /api/cron/poll-sgl   — every 2 min, syncs SGL → class_status
              └── /api/cron/notify     — every 1 min, fires mount-time SMS

Supabase
  ├── Auth   — session management; email/password + Google + Apple OAuth
  └── Postgres
        ├── users            — profile, warmup pref, active show
        ├── shows            — SGL show metadata (cached)
        ├── classes          — SGL class metadata (cached, scoped to show)
        ├── user_entries     — rider's class entries + manual overrides
        ├── class_status     — live data from SGL polling
        └── timing_config    — global timing constants (singleton, id=1)

External APIs
  ├── SGL NestJS API   — polled by cron; provides current_horse_number + class status
  └── Twilio SMS       — outbound SMS for mount-time notifications
```

---

## Auth Flow

1. User visits any protected route → `proxy.ts` checks session via `supabase.auth.getUser()`
2. No session → redirect to `/login`
3. Login/register via Supabase Auth (email+password or OAuth)
4. OAuth callback at `/auth/callback` exchanges code → session cookies written
5. On register: `POST /api/auth/register` inserts a row in `public.users` (phone + warmup default)
6. `proxy.ts` also refreshes the session token on every request, keeping cookies up to date

---

## Timing Engine

The timing calculation is a pure function in `lib/timing.ts` (no database calls). It is called on every read of `/api/user/entries` and inside the notify cron. Nothing is pre-computed or stored — timing is always fresh.

```
calculateTimes(entry, classStatus, timingConfig, now):

  effective_horse_count = entry.manual_horse_count ?? classStatus.current_horse_number
  horses_remaining      = max(0, entry.ride_position - effective_horse_count - 1)
  minutes_remaining     = horses_remaining × config.minutes_per_round

  if status == 'on_drag':
    minutes_remaining += max(0, config.drag_minutes - elapsed_since_drag_start)

  if status == 'course_walk':
    minutes_remaining += max(0, config.course_walk_minutes - elapsed_since_walk_start)

  warmup        = entry.warmup_override_minutes ?? user.warmup_minutes
  time_to_round = now + minutes_remaining
  time_to_mount = time_to_round - warmup
```

---

## SGL Polling

- Cron fires every 2 minutes (6 AM–7 PM show local time)
- Queries the set of distinct `class_id`s that have at least one active (non-completed) `user_entry`
- For each class, calls SGL's API and upserts into `class_status`
- Manual override invalidation: if SGL's `current_horse_number` ≥ `user_entry.manual_horse_count`, the manual override is cleared (SGL has caught up)

---

## Notification Dispatch

- Cron fires every 1 minute during show hours
- Queries `user_entries` where `notifications_enabled = true`, `completed = false`, `mount_notification_sent_at IS NULL`
- Runs `calculateTimes` for each entry
- If `time_to_mount` is within the next 2 minutes → sends Twilio SMS, sets `mount_notification_sent_at`
- The 2-minute window accounts for Vercel Cron's lack of sub-minute resolution; `mount_notification_sent_at` prevents double-sending

---

## Key Supabase Client Usage

| Context | Client | How |
|---|---|---|
| `'use client'` components | Browser client | `createClient()` from `lib/supabase/client.ts` |
| Server Components, Route Handlers | Server client | `await createClient()` from `lib/supabase/server.ts` (async; awaits cookies()) |
| Cron jobs, admin ops | Admin client | `createAdminClient()` from `lib/supabase/server.ts` (service role key, bypasses RLS) |
| `proxy.ts` | Inline `createServerClient` | Cannot import the helper; must instantiate directly from `@supabase/ssr` |

---

## Next.js 16 Conventions Used

| Convention | Detail |
|---|---|
| Middleware → Proxy | Auth guard lives in `proxy.ts`, exports `proxy` function |
| Async params | Route handler `params` is a Promise — always `await params` before destructuring |
| Async cookies | `cookies()` from `next/headers` is fully async — always `await cookies()` |
| Route Handlers | Named exports (`GET`, `POST`, etc.); use `Response.json()` not `NextResponse.json()` for responses |
