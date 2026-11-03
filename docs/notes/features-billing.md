# Billing — Learnings & Observations

Platform invoices, subscriptions, cover fees, and fail-to-pay enforcement. Split from `features.md` because this is payments + partner access.

## [2026-11-03] Plan-switch PaymentIntents must be Elements-ready

- `extractSubscriptionPayment` returns the latest invoice PaymentIntent secret even after it is `succeeded` or `canceled`. Partner Hub Billing (“Complete your plan switch” / Pay now) passed that secret to Elements, which 400s: “This PaymentIntent is in a terminal state”.
- `elementsReadyPayment` keeps only `requires_payment_method` / `requires_confirmation` / `requires_action`. Succeeded + nothing due clears local `amountDueCents`. Otherwise Pay now creates a new SetupIntent/PaymentIntent. The pay button stays hidden until Payment Element mounts.
- Why it matters: Basic past-due “Pay $39 now” showed a broken modal and `confirmPayment()` then failed because no element was mounted.

## [2026-11-03] Never hand terminal PaymentIntents to Elements

- `resumeInvoicePayment` (GraphQL `startInvoicePayment`) used to return any stored PI `client_secret`. After 3DS / `return_url` the PI is often `succeeded` while the local invoice is still unpaid — Stripe then errors: "PaymentIntent is in a terminal state and cannot be used to initialize Elements".
- Fix: only resume secrets in `requires_payment_method` / `requires_confirmation` / `requires_action`. If status is `succeeded`, confirm the invoice (`alreadyPaid`). Otherwise clear the id and create a new PI. Same Elements-usable filter on SetupIntent / reservation deposit secret retrieval.
- Why it matters: Partners returning from card auth saw a broken pay form instead of Paid.

## [2026-11-02] Free plans have no paid billing cycle

- Base / $0 packages do not use `durationUnit`/`durationCount` to gate upgrades. The one-paid-upgrade-per-period lock applies only while a **paid** period is still open (`currentPeriodEnd > now` and `monthlyPriceCents > 0`).
- Switching to a $0 plan clears `lastPaidPlanChangeAt`. Partner Hub Billing hides current-period dates on free plans; Plans & pricing hides duration when the package price is $0.
- Invoice due dates are UTC calendar days (`00:00 UTC` on the 1st of the next month for period invoices). UI copy must format with `timeZone: 'UTC'` and must not say “Please pay by {past date}” during grace.
- Why it matters: A restaurant on Base with a leftover Sep 29–Oct 29 window was blocked from upgrading on Nov 2 with “next upgrade after Oct 29”.

## [2026-11-01] Local invoices are mirrored to Stripe

- Period, manual, prepaid 3D, and SMS invoices call `attachStripeInvoiceToLocal` after create/refresh. Stripe gets `collection_method: send_invoice`, our invoice number, line descriptions, period start/end, due date, and custom fields. Payment still goes through Tablevera PaymentIntents; Stripe is marked `paid_out_of_band` after a local pay.
- `pending_invoice_items_behavior: exclude` so subscription pending items (e.g. Daily $2/day) are not pulled onto platform invoices. Webhooks for these mirrors (`metadata.source = tablevera_local`) must not overwrite local numbers or cancel the local row when we void a stale Stripe copy.
- Why it matters: Opening the Stripe hosted invoice for `INV-202610-0082` used to be blank because only a PaymentIntent existed.

## Fail-to-pay invoice policy (canonical)

OpenTable/Resy-style ladder for **platform invoices** (`totalCents > 0`, not paid/canceled): period bills (plan + covers + add-ons), manual invoices, and unpaid prepaid add-on invoices.

Clock: **oldest unpaid invoice due date** (UTC calendar days). $0 and not-yet-due invoices do not start the ladder. An open Stripe subscription balance with no local invoice uses `pastDueSince`.

### Payment terms

- Period invoices are billed monthly **in arrears**. Usage for `YYYY-MM` is due **00:00 UTC on the 1st of the next month**.
- Card on file is auto-charged on the due date; `/invoice/[token]` remains available.
- Fees are non-refundable except credits for billing errors, admin waivers, or as required by law.
- Plan changes stay blocked while `past_due`. Venue delete stays blocked while any platform debt remains.

### Ladder (days after due)

| Stage | Days | Diner-facing | Partner Hub |
| --- | --- | --- | --- |
| Current | before due | Listed | Full |
| Grace | 0–7 | Listed | Full; daily auto-charge retry |
| Overdue | 8–13 | Listed | Full; billing banner; finance charges start |
| Unlisted | 14–29 | Hidden from search/profile/**new** diner bookings | Full (honor existing reservations). Phone/walk-in logging still allowed |
| Restricted | 30–59 | Same as Unlisted | Billing + honor existing book only. No new in-product reservations (including walk-in/phone create). 30-day termination notice on day 30 |
| Terminated | 60+ | Hidden | Billing only. Subscription cancelled. Remaining upcoming reservations cancelled. Balance still owed |

Honor through Restricted: diners with `pending`/`confirmed` bookings can still open them; staff can seat / complete / no-show / cancel those covers.

### Fees

- **Finance charge:** 1.5%/month (150 bps) or the legal maximum, whichever is less. Assessed on the unpaid invoice total on **day 8** and each 30-day anniversary after that. Not during grace. Configurable on platform config (`failToPay.financeChargeBps`).
- **Declined-card fee:** $25 once per invoice on the first auto-charge decline. Daily retries do not stack. No fee when there is no card on file. Configurable (`failToPay.declinedFeeCents`).
- Fees are line items on the same invoice (`kind`: `finance_charge` / `declined_fee`).

### Restore

- Unlisted / Restricted restore when no unpaid invoice is still past that threshold.
- Terminated does **not** auto-restore. Settle all platform debt, then start a new subscription.
- Admin may pause the ladder, waive fees, extend grace, or force-restore (force-restore also pauses so the job does not immediately re-unlist).

### Notices

Days 0 (`invoice_ready` / invoice email), 1, 3, 7 (reminder), 8 (overdue), 13, 14, 21, 29, 30, 45, 59, 60.

### Disputes

Pay the undisputed amount on time. Admin credits change the remaining total; the clock follows whatever is still unpaid. A dispute does not freeze the ladder unless an admin pauses it.

## [2026-11-03] Seed owners must not retry invoice email forever
- Period invoice job runs on every API start (`startBillingWorker`). Auto-email uses the restaurant owner address; seed is `owner@tablevera.local`.
- `sendEmail` refuses `.local` / `.test` / `@example.com` (SendGrid reputation). If `emailSentAt` is never set, each restart WARN-retries.
- `maybeEmailInvoiceToOwner` skips non-deliverable owners, sets `emailSentAt` (no `emailSentTo`), and logs at debug. Manual `sendInvoiceEmail` still ValidationErrors.
- Why it matters: Local SENDGRID_API_KEY + seed owner used to flood the console on every turbo restart.

## [2026-10-31] Cancelled partners still need a pay path
- Partner Billing hid invoices on the cancelled plan picker. Delete-blocked debt (`assertRestaurantClearOfPlatformDebt`) then only showed as a toast with no **View invoice** link.
- Cancelled Billing now links the outstanding-balance alert to `/billing/invoices/:id` and lists invoices on that screen.
- Why it matters: Termination/cancel does not write off period invoices. Owners must pay before venue delete.

## [2026-10-30] Plan-change stub secrets are not Stripe Elements secrets
- `getPlanChangePayment` must expand `latest_invoice.confirmation_secret` (Stripe basil). If there is still no secret, collect a card via SetupIntent instead of fabricating `pi_dev_*_secret_dev`.
- Partner Hub `SignupPaymentForm` must skip Elements for remaining stubs (`pi_dev_*` / `_secret_dev`). Passing them with a live publishable key throws Stripe `IntegrationError`.
- Why it matters: Local `amountDueCents` plus a real publishable key used to crash Pay now. Demo continue is only for true stubs.

## [2026-10-29] Plan packages have a billing duration, not only monthly

- `durationUnit` (`day` | `week` | `month` | `year`) + `durationCount` on plan overrides / `PlanInfo`. Built-ins default to 1 month. Price is still stored as `monthlyPriceCents` but means **price per duration**.
- Period math uses `addPlanDuration` (calendar months/years, exact days/weeks). Stripe recurring is clamped to a 1-year interval (`toStripeRecurring`); local `currentPeriodEnd` keeps the full duration.
- Annual billing and first-month-free only apply to standard 1-month packages. Custom durations skip the monthly/annual toggle on public pricing.
- Manual invoices store `packageDurationUnit` / `packageDurationCount` and keep `packageDurationMonths` for month/year only.
- Why it matters: Do not assume every package is 30 days or 1 calendar month. Assigning a 14-day package must not extend by a month.

## [2026-10-29] Fail-to-pay ladder is persisted on the subscription

- Daily billing job (after period invoices + auto-charge) assesses finance/declined fees, advances `Subscription.billingEnforcement.stage`, sends notices, unlists at day 14, restricts at day 30, and terminates at day 60.
- Public listing excludes `unlisted` / `restricted` / `terminated` even while status is `past_due`. Mutations recompute the snapshot live so they do not wait for the 04:00 UTC job.
- Period invoice refresh keeps enforcement fee lines; paying one invoice only clears `past_due` when nothing else is outstanding.
- Why it matters: `past_due` used to keep diner search and Partner Hub fully open. Do not treat listing entitlements as “any non-cancelled subscription.”
