# Project Status

## Milestones
- [ ] Phase 1: Foundation — auth, routing shell, database
- [ ] Phase 2: Core logic — timing engine, CRUD API, home screen
- [ ] Phase 3: SGL integration — show/class data, live polling cron
- [ ] Phase 4: Notifications — Twilio SMS, notify cron

---

## Accomplished

### Phase 1 — Foundation
- ✅ **Step 1** — Database schema applied to Supabase (6 tables: `users`, `shows`, `classes`, `user_entries`, `class_status`, `timing_config`; `timing_config` seeded with defaults)
- ✅ **Step 2** — Supabase packages installed; browser client, server client, and admin client created (`lib/supabase/`); `.env.local` configured
- ✅ **Step 3** — App routing shell in place (all 7 placeholder pages); `proxy.ts` auth guard protects all non-auth routes
- ✅ **Step 4** — Auth UI: login + register forms (email/password + Google/Apple OAuth); `POST /api/auth/register` creates the `users` row; `/auth/callback` handles OAuth code exchange

---

## Next

- Phase 2, Step 5: `lib/timing.ts` — pure `calculateTimes()` function
- Phase 2, Step 6: User entries API routes (CRUD + advance + complete)
- Phase 2, Step 7: Profile API routes
- Phase 2, Step 8: Home screen (`EntryCard`, `CountdownTimer` components)
