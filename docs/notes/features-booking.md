# Booking — Learnings & Observations

## [2026-09-16] Public restaurant URLs are `/restaurants/:slug`
- `buildRestaurantBookingPath` emits `/restaurants/{slug|id}`. Legacy `/r/:slug` 308s there (middleware + next.config). Sitemap, JSON-LD, and share links use the helper.
- Why it matters: Don’t reintroduce `/r/` as the canonical diner URL.

## [2026-09-14] Draft resume is opt-in via `resume=1`
- Unauthenticated users are `replace`d to sign-in with `next=.../book?resume=1`. Drafts restore only when `resume === "1"`. Profile Book’s `next` often omits `resume=1` (OK when no draft yet).
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

## [2026-09-16] Experience booking is a dedicated modal, not an add-on scroll
- Restaurant profile lists experiences as Reserve cards. Reserve opens Find a table → optional package add-ons → summary, then applies date/slot/party back onto `#booking-form`. Slot grid is clipped to the experience start/end window.
- Why it matters: Don’t treat experience cards as “select and scroll to the widget.” The widget still completes guest details, deposit, and confirm.

## [2026-09-14] Availability deliberately uncached
- Availability uses `network-only`; bookable tables `no-cache` and only on the details step. Packages/experiences/spaces skipped until details. Drafts/occasions/loyalty thresholds come from `@reservations/shared`.
- Why it matters: Don’t “optimize” into cache-first without knowing conflict risk. Mobile booking rules track the shared package, not only API docs.
