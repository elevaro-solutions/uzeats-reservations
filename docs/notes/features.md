# Features — Learnings & Observations

## auth

See [features-auth.md](./features-auth.md) (auth / compliance).

## booking

See [features-booking.md](./features-booking.md) (payments / Stripe).

## virtual-room

See [features-virtual-room.md](./features-virtual-room.md) (experimental add-on billing / KIRI Engine). API, dashboard, and web only — not in the mobile apps yet.

## demo

### [2026-09-14] Dev component kit, not product UI
- `/demo` is a modal “Component kit” for Typography/Button/Chip samples.
- Why it matters: Safe playground — don’t wire product navigation to it.

## discovery

### [2026-09-14] Shared library, not a route
- No `app/` screen named discovery. Home/search/favorites/restaurant-profile import cards, location, search builders, `useToggleFavorite`.
- Why it matters: Treat it as the discovery SDK — changes ripple across domains.

### [2026-09-30] LocationSheet needs Android status-bar inset
- `presentationStyle="pageSheet"` is iOS-only; on Android the Modal is edge-to-edge. Header `paddingTop` must include `useSafeAreaInsets().top` (same pattern as FiltersSheet / AddReviewSheet).
- Why it matters: Fixed `space(3)` alone puts “Your location” under the status bar / punch-hole on Android.

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

### [2026-09-22] Help center is FAQ + contact, not tickets
- Help center has FAQ and Contact only. Diners email support or use the web contact form; they do not file GraphQL tickets.
- Partner tickets are dashboard `/support` (`createOwnerSupportTicket`) with rich text, image attachments, and manager replies.
- Why it matters: Don’t add diner `createMySupportTicket` ops — that mutation was removed.

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

### [2026-09-26] Upcoming cards use restaurant timezone
- Home carousel maps `MY_RESERVATIONS` with `restaurant.timezone` into `formatBookingCardDate` / `formatBookingCardTimeRange` (same wall clock as Reservations tab). Types include `timezone` on the nested restaurant.
- Why it matters: Leaving home on device-local clocks made the same booking disagree with the Reservations list for travelers.

### [2026-09-14] Opens Search by mutating global discovery
- Home `setDiscovery(...)` then `router.push("/search")`. Upcoming bookings reuse `MY_RESERVATIONS` (same query as Reservations tab), mapped/limited client-side.
- Why it matters: Back from Search shows whatever Home wrote into the MMKV-backed store. Booking `refetchQueries: MY_RESERVATIONS` refreshes the Home carousel too.

## messages

### [2026-09-14] Cross-feature imports + 5s polling
- Imports `MY_RESERVATION` from `booking/api` and date formatting from `reservations/helpers`. Messages poll every 5s (`network-only`) while mounted — no websocket.
- Why it matters: Domain boundaries are porous here. Polling has battery/network cost for the lifetime of the screen.

## notifications

### [2026-10-08] Running-late prompt is a full screen
- Closer reminders (inbox tap, push body, opening a pending/confirmed reservation within 2h) go to `/reservations/:id/running-late`, not a sheet or inline card. OS Yes/No on the push is unchanged.
- No / back dismisses for the session (`dismissRunningLatePrompt`) then `replace`s to reservation detail so the prompt does not loop. Yes `replace`s to messages after `reportRunningLate`.
- `?runningLate=1` still auto-reports on reservation detail (email already chose Yes).
- Why it matters: Auto-opening the prompt from detail must `replace` and honor dismiss; `push` to messages would leave the prompt on the back stack.

### [2026-10-08] Cold-start Yes must run once (id dedupe)
- Closer reminder push Yes used to skip `getLastNotificationResponse` on cold start so the action would not double-fire. If the process was dead, `reportRunningLate` never ran.
- Observer now handles last response and the live listener through the same path, keyed by `notification.request.identifier`. Yes still posts once; No still dismisses.
- Inbox, the running-late screen, and `?runningLate=1` share `reportRunningLateAndOpenThread` (toast + messages). Session `reported` set blocks a second "I'm running late." post.
- Why it matters: Don't skip Yes on kill-start; don't rely on Expo firing both last-response and the listener exactly once.

### [2026-10-08] Sign-out must unregister the device push token
- Logout only revoked refresh tokens; `User.pushTokens` stayed, so `notifyUser` kept sending Expo pushes to a signed-out phone.
- `unregisterPushToken(token)` `$pull`s that token from every user (no auth — token possession is the credential). Diner and merchant `logout()` and forced session invalidation call it before clearing SecureStore. `registerPushToken` now claims the token globally so a shared device maps to one account.
- Why it matters: Don't treat logout as enough to stop pushes; don't wipe all of a user's tokens on one-device sign-out.

### [2026-10-06] Reminder email late button survives sign-in
- Closer reminder emails link I'm running late to `/reservations/:id?runningLate=1`. The detail page already calls `reportRunningLate` when that query is present.
- Signed-out guests are sent to `/login?next=` with the query kept, so the report still runs after sign-in.
- Why it matters: Dropping `runningLate` on the login redirect made the email button open the reservation and never notify the restaurant.

### [2026-10-01] Closer reminders ask "running late?"
- Offsets: `REMINDER_OFFSETS_MINUTES = [1440, 120, 30]` (24h / 2h / 30m). Reminders with lead ≤ `REMINDER_LATE_CHECK_MAX_MINUTES` (120) send Expo/web push with `categoryId: reservation_reminder_late` (Yes/No).
- Yes → `reportRunningLate` → diner `Message` ("I'm running late.") + `notifyRestaurantManagers` (`new_message`, title "Guest running late"). No → dismiss.
- Diner mobile registers the category in `useNotificationObserver`. Cold-start Yes is handled once via notification identifier dedupe (see 2026-10-08). Slot edits call `scheduleReservationReminders` after canceling old jobs (including legacy `*h` ids).
- Why it matters: Don't put late-check buttons on the 24h reminder; don't route diner Yes/No through Elevaro (merchant-only).

### [2026-09-26] Soft push prime after booking/waitlist; bootstrap never OS-prompts
- Mobile no longer calls `requestPermissionsAsync` on sign-in. `PushBootstrap` only silently re-registers an Expo token when OS permission is already `granted`.
- Soft in-app `PushPermissionModal` (location-style priming) appears once after reservation confirmation or waitlist success dismiss, only when status is `undetermined` and MMKV `pushSoftPromptCompleted` is unset. Allow → OS dialog + register; Not now → mark completed (no soft-nag). Settings Enable still requests permission.
- Why it matters: Cold OS prompts on login get denied; ask at high-intent moments only after an affirmative tap.

### [2026-09-24] Unmapped notify types skipped in-app
- Types not in `NOTIFICATION_TYPE_TO_EVENT` used the password-reset fallback (`platform: false`), so `reservation_needs_approval`, `reservation_pending_approval`, `restaurant_inquiry`, and `staff_invite` never created inbox rows (email only).
- Fix: map those types; unknown non-`password_reset` types now use defaults (platform on) and log a warning. Stub email without SendGrid/Resend throws so status is `failed`, not fake `sent`.
- Why it matters: Manual-approval and inquiry alerts looked “broken” in Partner Hub / diner inbox despite successful SendGrid sends.

### [2026-09-22] Messenger ACL for Telegram Accept/Reject
- Channel `messenger` on notification preferences (default off). `notifyRestaurantManagers` Elevaro fan-out: restaurant owner always; staff only if `newReservation.messenger` (or `reservationUpdates.messenger` for update/cancel events). Action webhook re-checks that flag for non-owners. Dashboard `/notifications` exposes the column + Connect Telegram bot (up to 2 chats per user); `createElevaroTelegramLink` rejects diners and users without venue access; `elevaroTelegramLinks` returns current links + max.
- Why it matters: Previously every `restaurantIds` member got Accept/Reject; owners now opt managers in explicitly.

### [2026-09-22] Diner web push toggle needs local opt-in (+ VAPID for delivery)
- Profile Push switch previously only reflected `pushManager.getSubscription()`. Without `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (often unset locally), subscribe never ran, so refresh always showed Off.
- Opt-in is stored in `localStorage` (`rt-web-push-enabled`) and restored on load; when VAPID + permission exist, a missing subscription is re-created and `registerPushToken`’d.
- Why it matters: Toggle persistence ≠ push delivery. Delivery still needs public+private VAPID on web/API.

### [2026-09-22] Diner web profile hides SMS prefs
- `apps/web` `/profile` Notification preferences no longer shows the SMS toggle (email / push / favorite-table alerts remain). GraphQL `sms` channel fields and `/sms` opt-in are unchanged; SMS stays off by default.
- Why it matters: Don’t re-add the profile SMS switch without product sign-off; partner Premium SMS is separate.

### [2026-09-21] Elevaro merchant notifier fan-out
- `notifyRestaurantManagers` POSTs to Elevaro Merchant Notifier when `ELEVARO_NOTIFIER_*` is set; Accept/Reject land on `POST /webhooks/elevaro-notifier` → `updateReservationStatus`. GraphQL `createElevaroTelegramLink` for `@elevaro_merchant_bot`.
- Why it matters: Messenger Accept/Reject is out-of-process from the diner Telegram bot; Tablevera uses platform key `tablevera` (separate from UzEats).

### [2026-09-18] Partner Hub new-reservation tap fetches by id
- Header bell `new_reservation` goes to `/reservations/:id?restaurant=`. `notifyRestaurantManagers` always attaches `restaurantId`. The detail page loads `restaurantReservation(id)` and switches the active venue.
- Why it matters: Multi-location owners were looking up against the currently selected restaurant’s date-filtered list, so the click looked like a no-op.

### [2026-09-16] Android google-services.json is committed; FCM V1 key is not
- `android.googleServicesFile` points at `apps/mobile/google-services.json` (client config; tracked). FCM V1 service-account JSON (`*firebase-adminsdk*.json` / `*service-account*.json`) stays gitignored and is uploaded only via EAS credentials — not via the build archive.
- Why it matters: Don’t easignore/gitignore the client file or Android builds won’t register with FCM; don’t commit the private key.

### [2026-09-16] Shared deep-link helper; settings never auto-registers
- Push observer and inbox CTA both use `resolveNotificationLinkFromData` (`url` → `reservationId` → `restaurantId`). Settings keeps `auto: false` and only registers on Enable (root `PushBootstrap` owns silent re-register when already granted). Inbox/settings match Profile sign-in (`/sign-in` + `next`) and `sessionOffline` retry before guest CTA.
- Why it matters: Don’t re-duplicate deep-link order in the observer; don’t add a settings effect that races bootstrap.

### [2026-09-14] Push bootstrap is global; deep-link order matters
- `PushBootstrap` in root layout silently re-registers on auth when permission is already granted and handles taps: `data.url` → `reservationId` → `restaurantId`. Soft permission priming lives on booking confirmation / waitlist success (see 2026-09-26). Needs EAS `projectId` for Expo push token. Cold-start uses `getLastNotificationResponse()` once. Settings screen disables auto-register (`auto: false`) to avoid double flows.
- Why it matters: A notification tap can navigate on launch. Don’t mount a second auto-registering bootstrap on the settings screen.

### [2026-09-15] Inbox vs push settings routes
- `/notifications` is the in-app inbox (`NotificationsFeature`); push enablement lives at `/notification-settings` (`NotificationSettingsFeature`), linked from Profile → Preferences → Push alerts. Shortcuts → Notifications opens the inbox.
- Inbox uses `myNotifications(limit, offset)` → `{ items, total }`, mark-read mutations, and the same deep-link order for the detail-sheet CTA (`url` → `reservationId` → `restaurantId`).
- Why it matters: Don’t wire Profile “Notifications” to push settings; don’t assume array-shaped `myNotifications` after the connection change.

## profile

### [2026-10-08] Password is a Profile action
- Account menu has **Change password** (or **Add a password** when `hasPassword` is false) → `/change-password`. Personal info no longer has the password toggle. Email changes still ask for the current password on the editor; Google unlink without a password still creates one there.
- Why it matters: Password was buried in Personal info Sign-in and duplicated Privacy’s security feel.

### [2026-10-08] Personal info restyled to match Help/Profile
- Edit screen dropped bordered accordion cards (uppercase label + green rule). Layout is Help-style `EditProfileSection` titles, centered `UserAvatar` xl with a camera badge, and a booking-style sticky **Save changes** footer (`KeyboardStickyView`). Sign-in/Address stay expanded. Save is disabled until `toUpdateProfileInput` has a patch.
- Why it matters: Nested boxes and collapsed email/address made Personal info feel unlike the rest of diner mobile.

### [2026-10-08] Identity card pencil; Personal info is a screen
- Mobile Profile identity lives in `ProfileIdentityCard`: pencil `IconButton` (not an Edit label), name/email on the header, address as a labeled row when set. Phone is not shown on the card (it lives on Personal info). `/edit-profile` uses card presentation (same as Help/Favorites) with title “Personal info”. Account → Personal info row still opens the same screen. Loyalty referral Share uses `flexShrink: 0` so the bonus caption wraps instead of clipping the button.
- Why it matters: The editor was already a full-screen layout; modal presentation made it a sheet. The card Edit button crowded name/email.

### [2026-10-01] Referral bonus pts shown to diners
- Web `/profile` and mobile `ProfileLoyaltyCard` render `loyaltyProgram.referralBonusPoints` beside the referral code (and include it in the mobile Share message). Admin `/admin/loyalty` Referrals tab already showed the bonus.
- Why it matters: Clients already queried `referralBonusPoints` but never displayed it, so QA saw points for admins only.

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

### [2026-10-06] List segments re-sort by slot
- `filterReservationsBySegment` sorts upcoming soonest-first; past/cancelled/all most-recent-first. API `myReservations` is still `slotStart: -1`.
- Why it matters: Upcoming used to show the latest same-day booking first.

### [2026-09-27] Web diner slot labels use restaurant IANA zone
- Web `formatReservationDate` / `Time` / `When` take `timeZone` (default `PLATFORM_TIMEZONE`) and format via shared helpers; list/detail/billing/messages/survey pass `restaurant.timezone` from `MY_RESERVATIONS` / `MY_RESERVATION` / `RESERVATION_FOR_SURVEY`.
- Why it matters: Web previously used device-local `toLocale*`; a diner abroad saw wrong wall-clock times vs Partner Hub / mobile.

### [2026-09-26] List/detail use restaurant IANA zone (not device)
- Diner `formatReservationWhen` / `Date` / `Time` take `restaurant.timezone` (from `MY_RESERVATIONS` / `MY_RESERVATION`) and format via shared `formatUsDateTime` / `formatUsDate` / `formatTimeInTimeZone`; missing zone → `PLATFORM_TIMEZONE`. Booking/edit already passed timezone for slots.
- Why it matters: A diner in Tashkent viewing a NYC booking must see 7:00 PM ET, same as dashboard — not device-local `toLocale*`.

### [2026-09-18] Display locale is US English
- Reservation when/date/time helpers and API notification bodies format with `en-US` (12-hour). Shared helpers: `formatUsDate` / `formatUsTime` / `formatUsDateTime` (`DISPLAY_LOCALE`).
- Why it matters: Don’t use device locale for slot labels; a Uzbekistan/EU browser would show 24-hour and day-first dates.

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

### [2026-09-30] AddReviewSheet sticky Submit needs opaque footer + measured bottomOffset
- `KeyboardStickyView` translates the Submit footer over the scroll view when the keyboard opens (layout is not resized). Without `backgroundColor` / `stickyFooter` shadow, Photos copy showed through under the button. `bottomOffset` must clear the measured footer height plus the multiline comment field — caret-based avoidance alone left Submit overlapping the input bottom.
- Why it matters: Same sticky-footer + aware-scroll pairing as booking; multiline fields need extra clearance beyond footer height.

### [2026-09-30] AddReviewSheet close X had no stroke color
- Close control was `<XIcon size={24} />` with no `color`. `SvgWrapper` passes that through as `stroke={undefined}`, so the X was invisible. Photo remove on the same sheet already used `theme.colors.textPrimary`. Top bar also used fixed `paddingTop: space(2)` — on Android `pageSheet` is ignored and the Modal is edge-to-edge, so the hit target sat under the status bar (same pattern as FiltersSheet). Now: explicit icon color + `insets.top + space(2)`.
- Why it matters: Raw Lucide icons outside `IconButton` need an explicit theme color; full-screen Android Modals need top safe-area, not only bottom.

### [2026-09-29] Web reviews preview + sort + all modal
- Profile shows 5 reviews (`RESTAURANT_REVIEWS_PREVIEW_LIMIT`) with Newest / Oldest / Highest / Lowest (`ReviewSort` on `restaurantReviews`).
- "Show all N reviews" opens a modal (keeps booking context) with the same sort and Load more — not a separate route.
- Why it matters: Matches OpenTable-style scan-then-browse; a dedicated page would pull diners off the book flow.

### [2026-09-29] Review cards clamp to two lines
- Mobile `ReviewCard` uses `numberOfLines={2}` until Read more. Owner reply only renders when expanded. Short comments with a reply still show Read more so the reply isn’t orphaned forever.
- Why it matters: Matching web — guest text first, restaurant response on demand.

### [2026-09-18] Web restaurant details show reservation windows, not hours
- Web diner restaurant page dropped Hours (open/closed + weekly schedule) from the header and Details. Reservations stays, formatted as wall-clock ranges without a timezone suffix (`5:00 PM–10:00 PM`). Booking intro no longer says “Times shown in EDT”.
- Shared `formatBookingHours` / `formatShortHours` / `formatOpeningHoursLines` / `formatHmRange12` no longer append an abbreviation. Slot labels still convert ISO instants with the restaurant IANA zone so 7:00 PM Eastern is not 4:00 PM Pacific.
- Why it matters: Diners book a local table time; EDT/PDT on the profile duplicated the same clock twice.

### [2026-09-17] Header shows logo, weekly hours, and Maps address
- `Restaurant.logoUrl` is optional; diner pages fall back to the first gallery photo, then initials. Owners upload the mark from Profile / Settings / admin restaurant forms.
- Web hours meta keeps open/closed status and lists `formatOpeningHoursLines` (e.g. `Mon–Sun 5:00 PM–10:00 PM EDT`). Address is a Google Maps search/dir link (`buildMapsSearchUrl`).
- Mobile hours card keeps open/closed in the header; Schedule expands reservation windows + weekly lines (default closed). Status keeps the TZ once; reservations line strips a trailing abbrev so EDT isn’t duplicated when collapsed looks open.
- Hero count/dots `bottom` must clear `HERO_SHEET_OVERLAP` (sheet `marginTop: -space(n)`). Without that offset the `1 / N` pill sits in the sheet’s rounded corner.
- Why it matters: Status-only copy like "Opens at 5:00 PM" is not the schedule; don't treat gallery photos as the logo if a dedicated URL exists.

### [2026-09-17] Leave review does not require manager-completed status
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
- `generateReviewReplyDraft` (owner/manager via `assertRestaurantAccess`) returns
  a personalized draft; uses Gemini (`GEMINI_API_KEY`, default model
  `gemini-3.5-flash-lite`) when configured, else a templated draft. Drafts are not
  posted until `replyToReview`.
- `addRestaurantPhotos` appends deduped URLs up to `RESTAURANT_MAX_PHOTOS` (10).
  Dashboard Reviews UI can add each / selected diner photos to the gallery
  (hero order still controlled in Settings).
- Why it matters: “Manager” = `manager` with `restaurantIds`; reply already used
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
- Web restaurant details and the mobile menu tab render `selectPublicMenuSections`: items with `popular: true`, capped at 10. If none are marked, the first 8 items are shown. Owners, managers, and admins set the flags via checkboxes in the dashboard menu editor (`upsertMenu` rejects more than 10).
- Why it matters: Don’t assume the diner page lists the full in-app menu. Full menus belong on `menuUrl` / the restaurant website.

### [2026-09-14] Book gated by flags + auth; review scans all reservations
- Logged-out Book → sign-in with `next=/restaurant/:id/book` (no resume). Online book blocked if `reservationsVisible` or `reservationsEnabled` is false. `useReviewableReservation` filters `MY_RESERVATIONS` client-side for that restaurant + `canLeaveReview`.
- Why it matters: Profile can show restaurants that aren’t bookable online. Review eligibility loads the full reservation list (cache helps if Reservations already fetched).

## search

### [2026-09-29] Filters Modal needs top safe-area on Android
- `FiltersSheet` uses RN `Modal` with `presentationStyle="pageSheet"`. iOS sheets sit below the status bar; Android ignores `pageSheet` and draws edge-to-edge, so a fixed `paddingTop: space(3)` put “Filters” under the status icons. Header now uses `insets.top + space(3)` (footer already used `insets.bottom`).
- Why it matters: Full-screen Android modals must inset both ends; don’t assume `pageSheet` behavior cross-platform.

### [2026-09-14] Mode machine ≠ filters alone
- Modes `idle | suggestions | results`. `hasActiveSearchFilters` ignores date/party/near-me — those alone stay on browse/discovery UI. `requireAvailability` only when `time` is set.
- Why it matters: Picking only a date/party still browses the directory; adding a time switches to availability-constrained search.

### [2026-09-14] Dual discovery indexes; draft query vs committed query
- Global `DISCOVERY_INDEX` plus feature-scoped ops in `features/search/api/search.operations.ts`. Input draft debounces for suggestions; results use `committedQuery`. Clearing the field clears committed query so chips don’t stick.
- Why it matters: Don’t assume all search ops live in `graphql/operations.ts`. Typing without submitting doesn’t redefine the result set.

## merchant-more

### [2026-09-21] Account hub (tab still routed as `more`)
- Screen: centered profile, active restaurant switcher, one grouped Notifications + Waitlist list, muted Partner Hub note, logout confirm `Dialog`. Tab shows Account + filled `UserIcon`.
- Why it matters: IA is account/venue + day-of shortcuts — not app settings or billing; avoid stacking cards/alerts that crowd the first viewport.

## merchant-mobile (partner app)

### [2026-09-26] TZ QA: venue NY + host Asia/Tashkent
- Automated checklist in `apps/api/src/__tests__/restaurant-local-tz-qa.test.ts` (D1–D8 / M1–M6) + live `createOwnerReservation` at 19:00 with host `GMT+0500`: saved slot formats `7:00 PM`, lands on Partner Hub `date: todayIsoInTimeZone(venue)`, and sits in `calendarDayRange`. 19:00 ET → 4:00 AM Tashkent next calendar day (not midnight).
- Why it matters: Confirms mobile wiring matches Hub when phone TZ is far; chat bubble relative times may stay device-local by design.

### [2026-09-26] Ops “today” + list filters use restaurant calendar day
- Reservations Today query, client range filter (`calendarDayRange`), day headers, overview `date`, create-form date fallback, and message conversation “when” all use `activeRestaurant.timezone` (fallback `PLATFORM_TIMEZONE`). Create form resets default date when venue TZ loads unless the user edited date.
- Why it matters: Slot clocks alone were not enough — device midnight could drop/mislabel restaurant-today bookings and skew overview covers.

### [2026-09-26] Reservation clocks use `activeRestaurant.timezone`
- List/detail/floor slot labels pass venue timezone into `formatSlotDateTime` / `formatSlotTimeParts` (shared `formatTimeInTimeZone` + `DISPLAY_LOCALE`). Create submit uses `zonedWallClockToUtc` + `todayIsoInTimeZone` — not device `new Date(\`dateTtime\`)`.
- Why it matters: Staff phone TZ ≠ restaurant TZ must still match Partner Hub wall clock for the same booking.

### [2026-09-21] Waitlist/Floor toast copy is outcome-oriented
- Waitlist Notify/Seat/Remove toast success+error via `waitlistActionToastCopy` (not status nouns like `Marked cancelled`). Floor Complete/No-show/Cancel maps API statuses to human labels so `no_show` never appears raw. Message send errors use the shared `Please try again` fallback.
- Why it matters: Staff see the action they took; don’t reuse `Marked ${status}` with underscores.

### [2026-09-21] Messages inbox vs notifications venue scope
- Inbox queries are active-venue only; notifications are cross-venue and threads are reservation-scoped. Deep-linking into a conversation for another venue left Messages empty until `activeRestaurantId` was synced via `syncActiveRestaurantId` (toast on multi-venue change; see `docs/notes/merchant-mobile/features.md`).
- Reservation detail had the same trap (list-scoped to active venue). Fixed with `partnerReservation(id)` + notification `restaurantId`.
- Why it matters: Opening a conversation or reservation from a notification must not depend on which venue is selected.

### [2026-09-21] Reservation detail matches list-card action hierarchy
- Detail screen: status pill via `reservationStatusVisual`, calendar time block, Guest/Booking/Table cards; phone/email open `tel:`/`mailto:`. Sticky footer = primary lifecycle CTA + More → `ReservationActionsSheet`; Cancel/No-show require `Dialog` confirm. Assign table only for pending/confirmed/seated.
- Why it matters: Keep detail aligned with list cards — don’t stack a rainbow of status buttons or show assign on terminal bookings.

### [2026-09-21] Create reservation walk-in auto-seats
- API seats when `seatImmediately || source === 'walkin'`. Merchant create form forces Seat immediately on (Switch disabled) for walk-ins.
- Why it matters: UI must not imply walk-ins can stay “confirmed only.”

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

### [2026-10-03] Waitlist convert / expire / diner manage list
- Online join sends preferred time window from the unavailable slot (`preferredWindowFromSlot`, +2h). Booking a matching day marks waitlist `booked`. Notified holds expire after `WAITLIST_NOTIFY_HOLD_MINUTES` (15) via BullMQ and cascade to the next party when `notifiedSlot` is set. Seat creates a walk-in reservation. Diner mobile has `/waitlist` (Profile shortcut) for cancel/book.
- Why it matters: Don’t leave `booked`/`expired` as dead enums; partner Seat is not status-only anymore.
