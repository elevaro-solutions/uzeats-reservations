# Billing — Learnings & Observations

Platform invoices, subscriptions, cover fees, and fail-to-pay enforcement. Split from `features.md` because this is payments + partner access.

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

## [2026-10-29] Fail-to-pay ladder is persisted on the subscription

- Daily billing job (after period invoices + auto-charge) assesses finance/declined fees, advances `Subscription.billingEnforcement.stage`, sends notices, unlists at day 14, restricts at day 30, and terminates at day 60.
- Public listing excludes `unlisted` / `restricted` / `terminated` even while status is `past_due`. Mutations recompute the snapshot live so they do not wait for the 04:00 UTC job.
- Period invoice refresh keeps enforcement fee lines; paying one invoice only clears `past_due` when nothing else is outstanding.
- Why it matters: `past_due` used to keep diner search and Partner Hub fully open. Do not treat listing entitlements as “any non-cancelled subscription.”
