# GraphQL — Learnings & Observations

## [2026-09-24] Partner reservation custom range + export
- `restaurantReservations` accepts inclusive `startDate`/`endDate` (YYYY-MM-DD, restaurant TZ midnights). Period still wins when set (except `all`). Legacy single `date` remains for one-day filters. `restaurantId` is optional — omit it to list every venue the caller can access (platform TZ for the window).
- `exportRestaurantReservations` mirrors those filters (+ `status`/`format`) and returns Excel/PDF/JSON via the shared `formatExport` helpers (cap 5000 rows); multi-venue exports include a restaurant column.
- Why it matters: Don’t send `period` with a custom range from the partner list; URL uses `period=custom&startDate=&endDate=`. All-locations UI uses `locations=all` and omits `restaurantId` from the query.

## [2026-09-23] More DataLoaders + analytics bounds
- Loaders also cover shifts/menu/bookingWindow by restaurantId, Experience, Reservation. `groupAnalytics` aggregates last 90 days; `conversations` matches messages from last 90 days and `$limit: 100`.
- GraphQL IP limit is 300/min (was 100).
- Why it matters: Multi-venue analytics and busy inboxes no longer pull unbounded history into Node.

## [2026-09-23] Venue role `staff` → `manager`
- GraphQL `UserRole` and ops: `inviteManager`, `acceptManagerInvite`, `managerInviteByToken`. Clients must use the new names.
- Why it matters: Old `inviteStaff` / `acceptStaffInvite` queries will fail after deploy.

## [2026-09-23] `reportReview` vs `setReviewHidden`
- `reportReview(reviewId, reason: ReviewReportReason!, details)` — venue access; queues moderation without hiding.
- `setReviewHidden` — `requireAdmin` only. Prefer `setReviewHiddenAdmin` from Admin → Moderation for the same effect with FlaggedContentItem return shape.
- Why it matters: Partner clients must call `reportReview`, not hide.

## [2026-09-23] HTTP GraphQL batches + pause polls when hidden
- API `graphqlBatchMiddleware` runs BatchHttpLink arrays (≤20) with one shared `createContext` so DataLoaders batch across the waterfall. Web/dashboard terminate with `BatchHttpLink` (batchMax 10, batchInterval 15ms).
- Polling queries use `skipPollWhenHidden` (`document.hidden`) instead of always firing in background tabs.
- Why it matters: Restaurant page used to burn the 100 POSTs/min budget as separate requests; background tabs kept polling floor ops / waitlist / notifications.

## [2026-09-23] Request-scoped DataLoaders
- Context creates Restaurant/User/Table/bookmark DataLoaders per GraphQL request. Reservation/Review/Conversation/Waitlist field resolvers use them.
- Compound indexes: Reservation `{ restaurantId, slotStart, status }` (active statuses), Blackout `{ restaurantId, date }`.
- Why it matters: Reservation lists used to be 1 + N restaurant + N diner Mongo queries.

## [2026-09-23] GraphQL is 100 POSTs/min and unbatched
- `/graphql` uses express-rate-limit `limit: 100` per 60s per IP. Clients do not use BatchHttpLink. Diner home used to fire search plus one `availability` per card; DashShell used to load full `MY_RESTAURANTS` (tables/shifts/menu) on every partner route.
- Field resolvers have no DataLoader. Discovery search now batches `getAvailabilityForRestaurants` and embeds `availableSlotTimes`; DashShell uses `MY_RESTAURANTS_SHELL` with `tableCount`/`shiftCount`/`hasMenuItems`.
- Why it matters: Burst UIs hit 429s that look like “the app is slow.” Collapsing N+1 beats raising the limiter.

## [2026-09-23] Batched discovery availability + shell counts
- `getAvailabilityForRestaurants` loads Blackout/Shift/Table/Reservation/Claims once for the candidate id set. `searchRestaurants` attaches `availableSlotTimes` (first 4 open ISOs).
- `myRestaurants` / connection enrich with batched aggregates so shell UIs need not request nested `tables`/`shifts`/`menu`.
- Why it matters: Dated search was ~6 Mongo round-trips × N restaurants, then N client POSTs for the same slots.

## [2026-09-22] Owner tickets are a separate mutation
- `createOwnerSupportTicket` / `myOwnerSupportTickets` require `restaurant_owner` or `manager`. Requester is the caller. Restaurant id is access-checked. Payload clears assignee; notes are only those with `visibleToRequester`.
- Description is sanitized TipTap HTML. Attachments are image-only (`OwnerSupportAttachmentInput`). Admin replies are `addSupportNote(visibleToRequester: true)`. Requester follow-ups are `addOwnerSupportReply`. Both reply mutations accept optional `attachments` stored on the note (shown in the chat bubble).
- Admin `createSupportTicket` / `supportTickets` stay `requireAdmin`.
- Why it matters: Don’t expose the admin ticket mutations to partner clients. Diners do not have a ticket mutation.

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
- `restaurantReservations` accepts `period` (`today` … `all`) and `status`. Calendar days use restaurant timezone (`zonedWallClockToUtc` midnight, exclusive end). Custom ranges use inclusive `startDate`/`endDate` (see 2026-09-24). Legacy `date` is still a single YYYY-MM-DD. `period` wins over date args except `all`. Weeks start Sunday. `past`/`all` sort newest first.
- Why it matters: Filtering on the client would break pagination. Don’t send both `period` and `startDate`/`endDate` from the partner list — custom range uses the date args only.

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
