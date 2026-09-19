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
- Why it matters: Concurrent refetch can race the optimistic list.

### [2026-09-16] Favorites matches Profile offline gate
- `sessionOffline && !user` shows Try again via `refreshMe` before the guest sign-in CTA (same pattern as Reservations / notifications).
- Why it matters: Missing `user` alone is not enough to show “Sign in” when tokens exist offline.

## help-center

### [2026-09-14] Content mirrored from web by hand
- `help-center.content.ts` mirrors `apps/web/src/lib/legal.ts` — “keep in sync manually.”
- Why it matters: FAQ/contact drift is a process bug, not a codegen problem.

## legal

### [2026-09-15] In-app privacy/terms mirrored from web
- `/privacy` and `/terms` render `LegalFeature` with copy adapted from `apps/web` privacy/terms pages. Constants in `legal.constants.ts` mirror `apps/web/src/lib/legal.ts` (keep in sync manually). Cookies/SMS deep-links open `tablevera.online` in the browser — no dedicated mobile screens.
- Why it matters: Legal substance changes on web must be ported by hand; don’t assume a shared CMS.

### [2026-09-16] Calendar write-only disclosed for store answers
- Privacy Policy now calls out optional Add-to-calendar write-only access. Store questionnaire matrix: `docs/mobile-privacy-permissions.md`. iOS export compliance: `ITSAppUsesNonExemptEncryption: false`.
- Why it matters: App Privacy / Data safety answers must match calendar + location + push + Stripe behavior.

## home

### [2026-09-14] Opens Search by mutating global discovery
- Home `setDiscovery(...)` then `router.push("/search")`. Upcoming bookings reuse `MY_RESERVATIONS` (same query as Reservations tab), mapped/limited client-side.
- Why it matters: Back from Search shows whatever Home wrote into the MMKV-backed store. Booking `refetchQueries: MY_RESERVATIONS` refreshes the Home carousel too.

## messages

### [2026-09-14] Cross-feature imports + 5s polling
- Imports `MY_RESERVATION` from `booking/api` and date formatting from `reservations/helpers`. Messages poll every 5s (`network-only`) while mounted — no websocket.
- Why it matters: Domain boundaries are porous here. Polling has battery/network cost for the lifetime of the screen.

## notifications

### [2026-09-16] Android google-services.json is committed; FCM V1 key is not
- `android.googleServicesFile` points at `apps/mobile/google-services.json` (client config; tracked). FCM V1 service-account JSON (`*firebase-adminsdk*.json` / `*service-account*.json`) stays gitignored and is uploaded only via EAS credentials — not via the build archive.
- Why it matters: Don’t easignore/gitignore the client file or Android builds won’t register with FCM; don’t commit the private key.

### [2026-09-16] Shared deep-link helper; settings never auto-registers
- Push observer and inbox CTA both use `resolveNotificationLinkFromData` (`url` → `reservationId` → `restaurantId`). Settings keeps `auto: false` and only registers on Enable (root `PushBootstrap` owns auto-register). Inbox/settings match Profile sign-in (`/sign-in` + `next`) and `sessionOffline` retry before guest CTA.
- Why it matters: Don’t re-duplicate deep-link order in the observer; don’t add a settings effect that races bootstrap.

### [2026-09-14] Push bootstrap is global; deep-link order matters
- `PushBootstrap` in root layout registers on auth and handles taps: `data.url` → `reservationId` → `restaurantId`. Needs EAS `projectId` for Expo push token. Cold-start uses `getLastNotificationResponse()` once. Settings screen disables auto-register (`auto: false`) to avoid double flows.
- Why it matters: A notification tap can navigate on launch. Don’t mount a second auto-registering bootstrap on the settings screen.

### [2026-09-15] Inbox vs push settings routes
- `/notifications` is the in-app inbox (`NotificationsFeature`); push enablement lives at `/notification-settings` (`NotificationSettingsFeature`), linked from Profile → Preferences → Push alerts. Shortcuts → Notifications opens the inbox.
- Inbox uses `myNotifications(limit, offset)` → `{ items, total }`, mark-read mutations, and the same deep-link order for the detail-sheet CTA (`url` → `reservationId` → `restaurantId`).
- Why it matters: Don’t wire Profile “Notifications” to push settings; don’t assume array-shaped `myNotifications` after the connection change.

## profile

### [2026-09-16] Language is display-only; Push alerts uses sliders icon
- Language row sets `showChevron: false` (not actionable yet). Preferences “Push alerts” uses `SlidersHorizontalIcon` so it isn’t confused with Shortcuts “Notifications” (`BellIcon`). Loyalty card no longer ships `MOCK_LOYALTY_*` QA flags; track UI lives in `loyalty-tier-progress-track.component.tsx`.
- Why it matters: Two Bell rows looked like the same destination; mock flags are easy to leave on by accident.

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

### [2026-09-17] Header shows logo, weekly hours, and Maps address
- `Restaurant.logoUrl` is optional; diner pages fall back to the first gallery photo, then initials. Owners upload the mark from Profile / Settings / admin restaurant forms.
- Web hours meta keeps open/closed status and lists `formatOpeningHoursLines` (e.g. `Mon–Sun 5:00 PM–10:00 PM EDT`). Address is a Google Maps search/dir link (`buildMapsSearchUrl`).
- Mobile hours card keeps open/closed in the header; Schedule expands reservation windows + weekly lines (default closed). Status keeps the TZ once; reservations line strips a trailing abbrev so EDT isn’t duplicated when collapsed looks open.
- Hero count/dots `bottom` must clear `HERO_SHEET_OVERLAP` (sheet `marginTop: -space(n)`). Without that offset the `1 / N` pill sits in the sheet’s rounded corner.
- Why it matters: Status-only copy like "Opens at 5:00 PM" is not the schedule; don't treat gallery photos as the logo if a dedicated URL exists.

### [2026-09-17] Leave review does not require staff-completed status
- `canLeaveReview` / `isReservationReviewable` allow `completed` or past
  `confirmed`/`seated` (slot ended). Cancelled, no-show, and pending stay blocked.
- Why it matters: Diners often never see “Leave review” if the restaurant never
  marks the visit completed; UI already showed those rows as past.

### [2026-09-17] Review photos upload via `/api/uploads`
- `Review.photos` stores up to `REVIEW_MAX_PHOTOS` (3) public URLs. Clients
  upload through authenticated `POST /api/uploads` then pass URLs in
  `createReview`. Zod caps count; MIME allowlist lives on the upload route.
- Why it matters: Don’t invent a separate review upload path — reuse Spaces
  proxy like dashboard restaurant photos.

### [2026-09-17] Partner review reply drafts + gallery promotion
- `generateReviewReplyDraft` (owner/staff via `assertRestaurantAccess`) returns
  a personalized draft; uses Gemini (`GEMINI_API_KEY`, default model
  `gemini-3.5-flash-lite`) when configured, else a templated draft. Drafts are not
  posted until `replyToReview`.
- `addRestaurantPhotos` appends deduped URLs up to `RESTAURANT_MAX_PHOTOS` (10).
  Dashboard Reviews UI can add each / selected diner photos to the gallery
  (hero order still controlled in Settings).
- Why it matters: “Manager” = `staff` with `restaurantIds`; reply already used
  the same access helper as owners.

### [2026-09-16] Diner reviews rate four qualities
`createReview` keeps `rating` as overall and adds optional `foodRating` /
`serviceRating` / `atmosphereRating`. Web PostVisitModal and mobile
AddReviewSheet require all four; restaurant avg still rolls up overall only.

### [2026-09-16] Hero photo count lives on the gallery frame
- Web gallery hides the two side thumbs (and the `+N` overlay) at ≤576px, and seeded venues only have 3 photos so `+N` never appears. Count badge is on `.rt-restaurant-gallery` (not the hero `<button>`): the button can exceed the grid height, and `overflow: hidden` would clip a count positioned on it. Mobile native hero uses `{i} / {n}`.
- Why it matters: Don’t put gallery affordances only on the side thumbs, and don’t absolutely-position overlays on a child that can overflow the clipped gallery.

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

## merchant-mobile (partner app)

### [2026-09-19] More-actions sheet matches diner overflow list; No-show is neutral
- Sheet body: muted uppercase “Actions” label over a bordered `slate1` group (diner overflow-menu pattern). Cancel stays `error`; No-show uses `secondary` → `textPrimary`. Status chips can still paint no_show red via `reservationStatusVisual`.
- Why it matters: Section label clarifies the nested group; keep destructive Cancel red-only.

### [2026-09-19] Reservation cards: time block + secondary CTA
- List cards: muted calendar-style time block (`formatSlotTimeParts` → large clock + AM/PM) left; diner column (semibold name, guests/table with Users/Armchair icons); status pill absolute top-right; primary next action is full-width filled `secondary` with soft-radius More beside it (not circular).
- Status pills still use `reservationStatusVisual` (pending amber, confirmed blue, seated green, completed/cancelled slate, no_show red) — not Floor’s table-ops palette. Cancel / No-show stay in More → BottomSheet.
- Why it matters: Don’t use brand primary for every list CTA; don’t round the overflow control past `radius.md`.

### [2026-09-19] Reservations list uses lifecycle status colors + primary/overflow actions
- List cards lead with time · party · table, then guest; status pills use `reservationStatusVisual` (pending amber, confirmed blue, seated green, completed/cancelled slate, no_show red) — not Floor’s table-ops palette.
- Only the primary next action (Confirm / Seat / Complete) sits on the card; Cancel / No-show live in a More → BottomSheet.
- Why it matters: Don’t reintroduce a rainbow action row or reuse Floor seated=red on booking status chips.

### [2026-09-18] Floor uses furniture cards + status washes, not an absolute canvas
- Merchant Floor is a capacity-bucket furniture grid (2/4/6/banquet) with soft washes for `free` / `reserved` / `seated` / `turning`. Area filter is client-side on `floorArea`; layout coords (`posX`/`posY`) stay dashboard-only.
- Why it matters: Don’t port dashboard canvas UX to the phone; keep partner mobile scannable without pan-zoom.

### [2026-09-18] Reservations date filter is optional; upcoming/past are client-side
- `restaurantReservations(date:)` accepts an optional date. Merchant list passes `date=today` for Today; omits date for Upcoming/Past and filters by `slotStart` (plus status chips) on the client.
- Why it matters: Don’t assume a range API — broad fetch + client filter matches the dashboard lookup pattern (`limit: 100–200`).

### [2026-09-18] Waitlist status includes `seated` in GraphQL
- API `WaitlistStatus` includes `seated`; shared `WAITLIST_STATUSES` may lag. Merchant Notify/Seat/Remove map to `notified` / `seated` / `cancelled`.
- Why it matters: Prefer the GraphQL enum over the shared constant when wiring floor waitlist actions.
