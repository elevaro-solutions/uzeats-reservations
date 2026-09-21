# Booking — Learnings & Observations

## [2026-09-18] Owner booking emails use restaurant-local time
- `createReservation` / deposit confirm / owner booking used `Date#toLocaleString('en-US')` with no `timeZone`, so the email showed the API host zone (often UTC or the deploy region).
- Format with `formatDateTimeInTimeZone` + `restaurantTimeZone` (address/ZIP, then GeoJSON `coordinates[0]` / GraphQL `lng`).
- Why it matters: A LA owner whose API runs in UTC+5 must see 7:00 PM PDT, not 5:00 AM the next morning.

## [2026-09-18] Widget theme lives with the embed block
- Partner theme (color, button text, reviews) is edited on **Booking widget** and in the Settings booking-widget card, next to the share/embed script — not under Settings → Operations.
- Why it matters: Don’t send owners to Save preferences for button color; the widget card has its own Save widget theme.

## [2026-09-18] Past dates are blocked; display locale is US
- Diner DatePickers (web restaurant card, discovery, edit/experience booking) and partner create/edit reservation pickers `disabledDate` past days. Staff list/report date filters still allow history. URL `?date=` in the past is clamped to today.
- Guest-facing times use `en-US` 12-hour (`h:mm A` / `formatUsTime`). Ant Design `ConfigProvider` locale is `en_US` so calendars render `M/D/YYYY`, not the browser locale.
- Why it matters: A diner in a non-US locale used to see 24-hour times and DD.MM.YYYY, and could pick yesterday on the restaurant calendar.

## [2026-09-18] `BOOKING_RESTAURANT` tables must select `id`
- Apollo `Table` typePolicy uses `keyFields: ["id"]`. Selecting `tables { maxCapacity active }` without `id` throws “Missing field 'id'” as soon as Book navigates to the booking screen (unrelated to deposit).
- Why it matters: Any `Table` selection under a keyed typePolicy must include `id`.

## [2026-09-17] Confirming an already-confirmed reservation used to 400
- `createReservation` writes `confirmed` unless a deposit requires payment (`pending`). `updateReservationStatus` only allowed `pending → confirmed`, so Confirm on a normal booking threw `Cannot transition from confirmed to confirmed`.
- Same-status updates are now a no-op. Admin Confirm is pending-only; cancel must send `cancelled` (not `canceled`).
- Why it matters: Don’t assume staff need to Confirm every booking. Partner/admin UIs must not offer illegal transitions.

## [2026-09-16] Public restaurant URLs are `/restaurants/:slug`
- `buildRestaurantBookingPath` emits `/restaurants/{slug|id}`. Legacy `/r/:slug` 308s there (middleware + next.config). Sitemap, JSON-LD, and share links use the helper.
- Slug is immutable for owners: they request a change (`requestRestaurantSlugChange`); admins apply it (`adminUpdateRestaurant.slug` or approve the request). Previous slugs are stored on the restaurant and stay reserved so old links 308 to the current slug.
- Public profile copy (about, photos, discovery tags, FAQ, press, terms) is also request-only for partners (`requestRestaurantProfileChange`); admins approve at `/admin/profile-requests` or edit live on Manage.
- Why it matters: Don’t reintroduce `/r/` as the canonical diner URL. Don’t let `updateRestaurant` rewrite slug. Don’t reuse a former slug for a different venue. Don’t assume `/profile` writes the live diner page.

## [2026-09-16] Profile Book uses `resume=1`
- Unauthenticated users are `replace`d/`push`ed to sign-in with `next=.../book?resume=1` from booking gates **and** restaurant profile Book CTA. Drafts restore only when `resume === "1"`.
- Why it matters: Profile Book and mid-flow auth now restore drafts consistently.

## [2026-09-14] Draft resume is opt-in via `resume=1`
- Unauthenticated users are `replace`d to sign-in with `next=.../book?resume=1`. Drafts restore only when `resume === "1"`.
- Why it matters: Resume is not automatic whenever a draft exists on disk.

## [2026-09-14] Deposit / Stripe stubs and pay-failure still book
- Stub secrets `pi_stub_` / `pi_dev_` auto-succeed. Missing publishable key fails with a config message. Failed/cancelled pay can still create the reservation and route to detail; `confirmDeposit` failure may be swallowed (“webhook may reconcile”).
- Why it matters: Local API without Stripe can look “paid.” Don’t treat pay failure as “no booking.”

## [2026-09-16] Restaurant times are address-local
- Shift `HH:mm` is restaurant wall-clock. Availability ISO instants are built in `Restaurant.timezone` (from US address/ZIP). Clients must format slots with that IANA zone, not the diner browser TZ.
- Why it matters: A diner in California booking NYC should see 7:00 PM ET, not 4:00 PM PT.

## [2026-09-16] Period invoices auto-generate with cover source breakdown
- Daily/startup job creates Mongo invoices for current + previous UTC months. Lines are plan + network/website/widget cover (qty = covers). Unpaid auto invoices refresh; paid, `-M` manual, and Stripe-synced invoices skip. Due date is the 1st of the next month.
- Why it matters: Cover totals on Billing are not the bill — the period invoice is. Unique `restaurantId+billingPeriod` means a paid current-month invoice will not pick up later covers.

## [2026-09-18] Confirmation email carries the calendar invite
- `notifyDinerBookingConfirmed` renders `booking_confirmation`, attaches `reservation.ics`, and adds Google Calendar + View reservation buttons. Diner “Add to calendar” still downloads ICS and toasts a Google link because mobile browsers often swallow silent downloads.
- Why it matters: Don’t treat ICS-only as the handoff. SendGrid click tracking must stay off or those calendar/reset URLs hit a cert interstitial.

## [2026-09-16] Experience booking is a dedicated modal, not an add-on scroll
- Restaurant profile lists experiences as Reserve cards. Reserve opens Find a table → optional package add-ons → summary, then applies date/slot/party back onto `#booking-form`. Slot grid is clipped to the experience start/end window.
- Why it matters: Don’t treat experience cards as “select and scroll to the widget.” The widget still completes guest details, deposit, and confirm.

## [2026-09-14] Availability deliberately uncached
- Availability uses `network-only`; bookable tables `no-cache` and only on the details step. Packages/experiences/spaces skipped until details. Drafts/occasions/loyalty thresholds come from `@reservations/shared`.
- Why it matters: Don’t “optimize” into cache-first without knowing conflict risk. Mobile booking rules track the shared package, not only API docs.
