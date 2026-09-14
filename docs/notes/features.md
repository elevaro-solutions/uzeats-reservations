# Features — Learnings & Observations

## auth

### [2026-09-14] Soft gate; offline ≠ signed out
- Tabs are browsable logged out. Auth layout redirects only when `user` is set. `sessionOffline && !user` is treated as offline on profile/reservations, not as signed out.
- Why it matters: Tokens can exist with `user === null` offline — don’t treat missing user as definite logout.

### [2026-09-14] Google Sign-In is env-gated
- Needs `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (+ iOS client id on iOS). Logout best-effort `GoogleSignin.signOut` after SecureStore clear.
- Why it matters: Missing env fails the Google button at runtime; local logout still clears tokens.

## booking

### [2026-09-14] Draft resume is opt-in via `resume=1`
- Unauthenticated users are `replace`d to sign-in with `next=.../book?resume=1`. Drafts restore only when `resume === "1"`. Profile Book’s `next` often omits `resume=1` (OK when no draft yet).
- Why it matters: Resume is not automatic whenever a draft exists on disk.

### [2026-09-14] Deposit / Stripe stubs and pay-failure still book
- Stub secrets `pi_stub_` / `pi_dev_` auto-succeed. Missing publishable key fails with a config message. Failed/cancelled pay can still create the reservation and route to detail; `confirmDeposit` failure may be swallowed (“webhook may reconcile”).
- Why it matters: Local API without Stripe can look “paid.” Don’t treat pay failure as “no booking.”

### [2026-09-14] Availability deliberately uncached
- Availability uses `network-only`; bookable tables `no-cache` and only on the details step. Packages/experiences/spaces skipped until details. Drafts/occasions/loyalty thresholds come from `@reservations/shared`.
- Why it matters: Don’t “optimize” into cache-first without knowing conflict risk. Mobile booking rules track the shared package, not only API docs.

## demo

### [2026-09-14] Dev component kit, not product UI
- `/demo` is a modal “Component kit” for Typography/Button/Chip samples.
- Why it matters: Safe playground — don’t wire product navigation to it.

## discovery

### [2026-09-14] Shared library, not a route
- No `app/` screen named discovery. Home/search/favorites/restaurant-profile import cards, location, search builders, `useToggleFavorite`.
- Why it matters: Treat it as the discovery SDK — changes ripple across domains.

### [2026-09-14] Home feed ignores browse filters; Places degrades silently
- `buildHomeFeedInput` only applies location (search facets must not affect Home). Cuisine chips on Home mutate store then navigate to Search. Google Places REST needs `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`; missing key returns `[]` / `null` and the location sheet falls back toward New York without an obvious “key missing” error. Module-level Places session token for billing.
- Why it matters: Home and Search share discovery state but not the same filter contract. Location failures look like empty predictions, not config errors.

### [2026-09-14] Infinite search is client-assembled; favorite toggle silent on failure
- `useInfiniteRestaurantSearch` keeps local `items`/`page`, dedupes by id, resets on `JSON.stringify(searchInput)`. Favorite toggle flips local state and reverts on catch with no toast; unauthenticated → sign-in with `next=/restaurant/:id`.
- Why it matters: Pagination is React state, not Apollo `fetchMore`. Failed favorite looks like a no-op.

## favorites

### [2026-09-14] `favorite` ≠ `save`
- List uses `MY_SAVED_RESTAURANTS` with `kind: "favorite"`. Reservation detail “Save restaurant” uses `SAVE_RESTAURANT` / `isSaved` (past visits).
- Why it matters: Hearts and “Save restaurant” are different backend kinds.

### [2026-09-14] Undo is local list + re-favorite mutation
- Unfavorite removes from local list + toast Undo; Undo calls `favoriteRestaurant` and reinserts at index without refetching Apollo as source of truth.
- Why it matters: Concurrent refetch can race the optimistic list. Favorites does not handle `sessionOffline` like Profile/Reservations (shows sign-in instead).

## help-center

### [2026-09-14] Content mirrored from web by hand
- `help-center.content.ts` mirrors `apps/web/src/lib/legal.ts` — “keep in sync manually.”
- Why it matters: FAQ/contact drift is a process bug, not a codegen problem.

## home

### [2026-09-14] Opens Search by mutating global discovery
- Home `setDiscovery(...)` then `router.push("/search")`. Upcoming bookings reuse `MY_RESERVATIONS` (same query as Reservations tab), mapped/limited client-side.
- Why it matters: Back from Search shows whatever Home wrote into the MMKV-backed store. Booking `refetchQueries: MY_RESERVATIONS` refreshes the Home carousel too.

## messages

### [2026-09-14] Cross-feature imports + 5s polling
- Imports `MY_RESERVATION` from `booking/api` and date formatting from `reservations/helpers`. Messages poll every 5s (`network-only`) while mounted — no websocket.
- Why it matters: Domain boundaries are porous here. Polling has battery/network cost for the lifetime of the screen.

## notifications

### [2026-09-14] Push bootstrap is global; deep-link order matters
- `PushBootstrap` in root layout registers on auth and handles taps: `data.url` → `reservationId` → `restaurantId`. Needs EAS `projectId` for Expo push token. Cold-start uses `getLastNotificationResponse()` once. Settings screen disables auto-register (`auto: false`) to avoid double flows.
- Why it matters: A notification tap can navigate on launch. Don’t mount a second auto-registering bootstrap on the settings screen.

## profile

### [2026-09-14] Offline empty state before guest CTA
- Checks `sessionOffline && !user` before the signed-out CTA (same pattern as Reservations).
- Why it matters: Missing `user` alone is not enough to show “Sign in” when tokens exist offline.

## reservations

### [2026-09-14] Status math is client-side and time-based
- `reservation-display.helpers.ts` derives past/upcoming from status sets + `slotEnd`/`slotStart` vs `Date.now()`. Display can show `past` / `deposit_due` even if API status is still `confirmed`.
- Why it matters: Segment filters and CTAs depend on device clock, not only API status.

### [2026-09-14] Edit reuses booking machinery; CTA priority is ordered
- Edit pulls availability/tables helpers and the same `network-only` / `no-cache` patterns as booking. `resolvePrimaryCta`: pay deposit → leave review → book again; overflow de-dupes actions already shown as primary.
- Why it matters: Booking time-helper changes often affect edit. Primary CTA order is intentional product priority.

## restaurant-profile

### [2026-09-14] Book gated by flags + auth; review scans all reservations
- Logged-out Book → sign-in with `next=/restaurant/:id/book` (no resume). Online book blocked if `reservationsVisible` or `reservationsEnabled` is false. `useReviewableReservation` filters `MY_RESERVATIONS` client-side for that restaurant + `canLeaveReview`.
- Why it matters: Profile can show restaurants that aren’t bookable online. Review eligibility loads the full reservation list (cache helps if Reservations already fetched).

## search

### [2026-09-14] Mode machine ≠ filters alone
- Modes `idle | suggestions | results`. `hasActiveSearchFilters` ignores date/party/near-me — those alone stay on browse/discovery UI. `requireAvailability` only when `time` is set.
- Why it matters: Picking only a date/party still browses the directory; adding a time switches to availability-constrained search.

### [2026-09-14] Dual discovery indexes; draft query vs committed query
- Global `DISCOVERY_INDEX` plus feature-scoped ops in `features/search/api/search.operations.ts`. Input draft debounces for suggestions; results use `committedQuery`. Clearing the field clears committed query so chips don’t stick.
- Why it matters: Don’t assume all search ops live in `graphql/operations.ts`. Typing without submitting doesn’t redefine the result set.
