# Mobile booking flow QA — 2026-09-08

**App:** Tablevera diner (`apps/mobile`)  
**Environment:** Local API + iOS Simulator (iPhone 16e), signed-in session  
**Policy:** Report only — **no code fixes** in this pass  
**Evidence:** Live deep links + screenshots, GraphQL probes, Metro logs, code review, `.qa-screenshots/`

## Verdict

Entry and datetime screens load correctly for seeded venues. Several data/runtime issues are confirmed. Full **slot → details → confirm → confirmation** could not be re-driven automatically (macOS Accessibility denied for host taps into Simulator). Confirmation with a missing `reservationId` still shows the known error UI (expected for that deep link). Prior successful-book confirmation failure needs a **manual** re-smoke after a real create.

## Flow under test

Home/Search → restaurant profile → Book → datetime → details → confirm sheet → (Stripe/stub) → confirmation

## What worked (live)

| Check | Result |
| --- | --- |
| Home Popular list + tab bar | OK |
| Deep link `tablevera://restaurant/{id}` | Opens profile; sticky Book CTA |
| Deep link `…/book` (Samarkand, signed in) | Book a table + Lunch/Dinner slots |
| Past-slot filtering | At ~12:15 local, first lunch chip is 12:30 |
| Shift grouping | Lunch / Dinner match API shifts |
| Continue disabled without selection | Expected |
| Teahouse profile Book entry | OK |
| Teahouse availability (party 2) | 27 available slots |
| Samarkand deposit metadata | `depositRequired`, `$25` (`2500` cents), guest table selection on |
| Samarkand tables | 5 active; maxCapacity **10** |
| Party 12 / 20 availability | **0** slots (supports party-too-large / empty paths) |
| Confirmation without `reservationId` | Error UI + Home only (see screenshots) |

## Confirmed issues

### P1 — Seed cuisine vs description mismatch

- **Live (Teahouse Choyxona 45):** Meta shows **Mexican · Budget**; About says **“Authentic Uzbek cuisine…”**.
- **API:** `cuisine: "Mexican"`, description still Uzbek / seed venue copy.
- **Also seen earlier:** Market Choyxona 60 = Thai vs Uzbek about.
- **Impact:** Discovery filters and profile meta disagree with branding/copy.

### P1 — Apollo `bookableTables` cache warning

- **Metro:** Apollo Client error **message 15** on `Query.bookableTables` (cache may lose data when replacing lists of different lengths). Still fires while using booking.
- **Code already has** `keyArgs` + `merge` in `apps/mobile/src/graphql/client.tsx`; warning persists.
- **Impact:** Risk of wrong/empty table picker on details (Samarkand allows guest table selection).

### P2 — Stripe PaymentSheet `returnURL` warning

- **Metro (earlier in session):** SDK warns `returnURL` not provided to `initPaymentSheet`.
- **Code** passes `returnURL: "tablevera://stripe-redirect"` in `use-deposit-payment.hook.ts`; StripeProvider has `urlScheme="tablevera"`.
- **Impact:** Redirect-based payment methods may be hidden for real (non-stub) deposits.

### P2 — Profile Book sign-in `next` omits `resume=1`

- Profile Book sends `/sign-in?next=/restaurant/{id}/book` without `resume=1`.
- Booking screen’s own auth gate uses `?resume=1`.
- **Impact:** Weaker draft restore after login from profile vs mid-flow auth.

### P2 — Require cycles (components barrel)

- Metro: `src/components/index.ts` ↔ skeleton / `date-time-field`.
- **Impact:** Usually non-fatal; possible uninitialized exports under reload.

### P3 — Seed address / hours homogeneity

- Home cards share **100 Main St** and similar **11:30–22:00** hours with rotated names/cuisines.
- **Impact:** Looks unfinished; weak location QA.

### P3 — “Seed venue #N” in diner-facing About copy

- Visible on Teahouse profile About text.
- **Impact:** Dev placeholder leaks into product UI.

## Prior P0s — status

| Issue | Prior evidence | This pass |
| --- | --- | --- |
| Slot tap does not stick / Continue stays disabled | `.qa-screenshots/02–04`, `06–07` | **Not re-verified interactively** (Accessibility blocked Simulator taps). Code path for selection looks sound (`slotTimesEqual`, chip `selected` styles). |
| Confirmation missing `reservationId` after book | `.qa-screenshots/05-confirmation.png` | Deep link without id still errors (expected). Submit code now uses `params: { reservationId }` — **needs one manual happy-path book** to close. |

## Blocked / not exercised in UI

- Slot select → Continue → details (host CGEvent/cliclick do not reach Simulator without Accessibility trust).
- Confirm sheet, terms, createReservation, Stripe/stub pay, success confirmation.
- Waitlist join CTA (UI).
- Party-too-large UI (API ready: max table 10; party ≥12 → empty availability).
- Promo / gift / loyalty / add-ons on details.

## Manual smoke (recommended)

1. Samarkand → Book → tap **12:30** → chip selected + Continue enabled.  
2. Continue → details: tables load (watch Metro for `bookableTables`) → Review.  
3. Terms → confirm → confirmation shows ref (not “Could not load”).  
4. Teahouse (no deposit) same path.  
5. Guests **12+** → party-too-large / call UI.  
6. Fully booked day → waitlist.

## Screenshots (this pass)

| File | Notes |
| --- | --- |
| `.qa-screenshots/08-samarkand-datetime-live.png` | Samarkand datetime, Continue disabled |
| `.qa-screenshots/09-confirmation-no-id.png` | Confirmation error without reservationId |
| `.qa-screenshots/10-teahouse-profile-cuisine.png` | Mexican vs Uzbek mismatch |

## Out of scope (not booking bugs)

- Demo kit “Book a table” buttons (UI kit only).  
- Home bookings carousel (existing reservations).  
- No Detox/Maestro suite; mobile booking remains manual.
