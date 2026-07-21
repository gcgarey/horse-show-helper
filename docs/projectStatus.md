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

- ✅ **Step 5** — `lib/timing.ts`: pure `calculateTimes()` with TypeScript types; handles null class_status, resolves numeric columns
- ✅ **Step 6** — User entries API routes: GET, POST, PATCH, DELETE, advance (+1 horse count), complete
- ✅ **Step 7** — `GET` + `PATCH /api/user/profile` (warmup_minutes, phone)
- ✅ **Step 8** — Home screen: `EntryCard`, `CountdownTimer`, `app/(app)/page.tsx` (polls every 30s; empty state with CTA)
- ✅ **Phase 2 complete**

---

## Next

- Phase 3, Step 9: Reverse-engineer SGL API endpoints via browser DevTools (manual step)
- Phase 3, Step 10: `lib/sgl.ts` — SGL adapter (searchShows, getClassesForShow, getClassStatus)
- Phase 3, Step 11: Shows + classes API routes + UI (show select, class browser)
- Phase 3, Step 12: SGL polling cron (`/api/cron/poll-sgl`)
