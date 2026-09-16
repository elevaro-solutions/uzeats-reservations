# Features — Learnings & Observations

## auth

See [features-auth.md](./features-auth.md) (auth / compliance).

## booking

See [features-booking.md](./features-booking.md) (payments / Stripe).

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

## legal

### [2026-09-15] In-app privacy/terms mirrored from web
- `/privacy` and `/terms` render `LegalFeature` with copy adapted from `apps/web` privacy/terms pages. Constants in `legal.constants.ts` mirror `apps/web/src/lib/legal.ts` (keep in sync manually). Cookies/SMS deep-links open `tablevera.online` in the browser — no dedicated mobile screens.
- Why it matters: Legal substance changes on web must be ported by hand; don’t assume a shared CMS.

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

### [2026-09-15] Inbox vs push settings routes
- `/notifications` is the in-app inbox (`NotificationsFeature`); push enablement lives at `/notification-settings` (`NotificationSettingsFeature`), linked from Profile → Preferences → Push alerts. Shortcuts → Notifications opens the inbox.
- Inbox uses `myNotifications(limit, offset)` → `{ items, total }`, mark-read mutations, and the same deep-link order for the detail-sheet CTA (`url` → `reservationId` → `restaurantId`).
- Why it matters: Don’t wire Profile “Notifications” to push settings; don’t assume array-shaped `myNotifications` after the connection change.

## profile

### [2026-09-14] Offline empty state before guest CTA
- Checks `sessionOffline && !user` before the signed-out CTA (same pattern as Reservations).
- Why it matters: Missing `user` alone is not enough to show “Sign in” when tokens exist offline.

### [2026-09-15] About replaced by Privacy / Terms
- Preferences no longer has “About Tablevera.” Rows push `/privacy` and `/terms`. Sign-up `TermsToggle` links the same routes without toggling the switch.
- Why it matters: Profile and auth agreement share the legal feature routes.

## reservations

### [2026-09-15] Overflow menu must not nest sheet inside backdrop Pressable
- `ReservationOverflowMenu` used `<Pressable backdrop><Pressable sheet/></Pressable>`. Opening from the header “More actions” button made the sheet appear to do nothing: the same tap dismissed the Modal via the backdrop. Use `BottomSheet` (sibling backdrop + sheet), same as cancel/billing sheets.
- Why it matters: Any custom Modal that wraps content in the dismiss Pressable will instant-close on iOS/Android when opened from a press.

### [2026-09-14] Status math is client-side and time-based
- `reservation-display.helpers.ts` derives past/upcoming from status sets + `slotEnd`/`slotStart` vs `Date.now()`. Display can show `past` / `deposit_due` even if API status is still `confirmed`.
- Why it matters: Segment filters and CTAs depend on device clock, not only API status.

### [2026-09-14] Edit reuses booking machinery; CTA priority is ordered
- Edit pulls availability/tables helpers and the same `network-only` / `no-cache` patterns as booking. `resolvePrimaryCta`: pay deposit → leave review → book again; overflow de-dupes actions already shown as primary.
- Why it matters: Booking time-helper changes often affect edit. Primary CTA order is intentional product priority.

## restaurant-profile

### [2026-09-16] Confirm modal renders while closed and formats a null slot
- `ReservationConfirmModal` stays mounted with `open={false}`. Its `details.timeLabel` was `formatSlotLabel(selectedSlot!)`, so a direct visit with no `?slot=` threw in `formatTimeInTimeZone` (`null.getTime()`). Search links that already had a slot looked fine.
- Why it matters: Don’t assume booking details are only computed when the modal opens. Slot formatters must tolerate null.

### [2026-09-16] Public menu is popular dishes only
- Web restaurant details and the mobile menu tab render `selectPublicMenuSections`: items with `popular: true`, capped at 10. If none are marked, the first 8 items are shown. Owners, staff, and admins set the flags via checkboxes in the dashboard menu editor (`upsertMenu` rejects more than 10).
- Why it matters: Don’t assume the diner page lists the full in-app menu. Full menus belong on `menuUrl` / the restaurant website.

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
