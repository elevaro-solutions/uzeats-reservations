# GraphQL — Learnings & Observations

## [2026-09-18] SendGrid click tracking breaks reset HTTPS
- Password-reset (and other) emails were rewritten onto SendGrid’s click-tracking host, which showed “connection is not private.” `sendViaSendGrid` now sends `tracking_settings.click_tracking.enable: false` (and open tracking off). Reset links use `WEB_APP_URL` / `DASHBOARD_APP_URL` with trailing slashes stripped.
- Why it matters: Don’t re-enable SendGrid click tracking unless that domain has a valid cert and the app can still read the original `token` query.

## [2026-09-18] Partner Messages poll the open thread only
- Inbox `conversations` / inquiries are fetch-on-load. `messages(reservationId)` polls every 30s while the document is visible; hidden tabs set `pollInterval` to 0.
- Why it matters: A 5–15s inbox poll looks like a leak in DevTools. Apollo 4 still sets `loading` true during polls unless `notifyOnNetworkStatusChange` is false.

## [2026-09-18] `updateRestaurantSettings` must `$set`
- Plain `findByIdAndUpdate(id, update)` can miss nested `widgetTheme.*` keys. Persist with `{ $set: update }` and `{ new: true }`; skip the write when `update` is empty. The dashboard Save buttons stay disabled until the form is dirty and only toast success when the mutation returns an id.
- Why it matters: A success toast without `$set` / refetch looks like settings saved when reload still shows the old values.

## [2026-09-18] `restaurantReservation(id)` is the partner deep-link
- Partner details live at `/reservations/:id` and load `restaurantReservation(id)` (access-checked to the booking’s venue). List `?reservationId=` without `edit=1` redirects there. `edit=1` still opens the list editor.
- Why it matters: Don’t open a partner booking by scanning the current location’s page of rows.

## [2026-09-18] Partner reservation list filters are server-side
- `restaurantReservations` accepts `period` (`today` … `all`) and `status`. Calendar days use restaurant timezone (`zonedWallClockToUtc` midnight, exclusive end). `date` remains a single YYYY-MM-DD for analytics/admin. `period` wins over `date` except `all`. Weeks start Sunday. `past`/`all` sort newest first.
- Why it matters: Filtering on the client would break pagination. Don’t send both `period` and `date` from the partner list — custom date uses `date` only.

## [2026-09-18] Apollo 4 `loading` is true during polls
- `notifyOnNetworkStatusChange` defaults to `true`. `loading` is true for any in-flight request, including `pollInterval` (`NetworkStatus.poll`).
- Floor ops sets `notifyOnNetworkStatusChange: false`, polls every 30s, skips hidden tabs, and applies results only when the tables/unassigned snapshot changes — no Card skeleton, no full reload.
- Why it matters: Live ops pages should poll silently. Do not pass `loading` straight into Card/Table if the query polls.

## [2026-09-16] Offline launch vs mid-request 401 aligned
- `refreshMe` keeps tokens and sets `sessionOffline` on network refresh failure. Apollo `errorLink` on `UNAUTHENTICATED` clears tokens only when refresh fails with `reason !== "network"` (invalid/rejected refresh), matching cold-start behavior.
- Why it matters: Flaky networks during GraphQL calls no longer wipe a still-valid session.

## [2026-09-14] Dual transport for auth vs Apollo
- Apollo handles most ops; session bootstrap (`Me`) and token refresh use raw `fetch` + inline GraphQL strings. The `ME` document in `operations.ts` is unused for bootstrap.
- Why it matters: Auth session can succeed/fail independently of Apollo cache — don’t assume `me` is in InMemoryCache after launch.

## [2026-09-14] Sparse but load-bearing cache policies
- `Address` uses `merge: true` (no id). `Table` uses `keyFields: ["id"]`. `bookableTables` keys on `restaurantId/slotStart/partySize` and replaces incoming.
- Why it matters: Without Address merge, SEARCH vs MY_RESERVATIONS selections fight. Table lists must not rely on append-merge.

## [2026-09-14] Shared `BOOK` is unused by the booking flow
- `operations.ts` exports `BOOK` (`createReservation`), but live booking uses richer `CREATE_RESERVATION` in `features/booking/api/booking.operations.ts`. Password reset hardcodes `app: "web"` in `graphql/auth.tsx` (API only accepts `web` | `dashboard`).
- Why it matters: Editing shared `BOOK` won’t affect booking. Reset email/deeplink may target web until mobile deep links exist.
