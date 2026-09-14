# Booking — Learnings & Observations

## [2026-09-14] Draft resume is opt-in via `resume=1`
- Unauthenticated users are `replace`d to sign-in with `next=.../book?resume=1`. Drafts restore only when `resume === "1"`. Profile Book’s `next` often omits `resume=1` (OK when no draft yet).
- Why it matters: Resume is not automatic whenever a draft exists on disk.

## [2026-09-14] Deposit / Stripe stubs and pay-failure still book
- Stub secrets `pi_stub_` / `pi_dev_` auto-succeed. Missing publishable key fails with a config message. Failed/cancelled pay can still create the reservation and route to detail; `confirmDeposit` failure may be swallowed (“webhook may reconcile”).
- Why it matters: Local API without Stripe can look “paid.” Don’t treat pay failure as “no booking.”

## [2026-09-14] Availability deliberately uncached
- Availability uses `network-only`; bookable tables `no-cache` and only on the details step. Packages/experiences/spaces skipped until details. Drafts/occasions/loyalty thresholds come from `@reservations/shared`.
- Why it matters: Don’t “optimize” into cache-first without knowing conflict risk. Mobile booking rules track the shared package, not only API docs.
