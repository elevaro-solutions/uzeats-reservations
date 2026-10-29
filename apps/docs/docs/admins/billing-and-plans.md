# Billing & plans

Tablevera uses **Stripe** for partner subscriptions, deposits, and invoicing.

## Subscription plans

Plan definitions live in `apps/api/src/config/plans.ts`. Each plan includes:

- Monthly price
- Feature flags (table limits, campaign access, etc.)
- **Manager seats** (`managerSeats`) — how many Manager (`manager`) accounts the owner can invite (minimum 1; Basic 1 / Core 3 / Pro 5 by default). The restaurant owner does not consume a seat. Owners manage the team at Partner Hub → Settings → Team; upgrade the package for more seats.
- Trial period (when applicable)

Partners choose a plan during signup or change plans in **Settings → Billing**.

## Plan changes

Policy implemented in `apps/api/src/services/planChangePolicy.ts`:

| Change type | Behavior |
|---|---|
| **Switch right away** | Charge the **full** new monthly price today (not a prorated difference). Unused time on the current plan is not credited. A new billing period starts now. |
| **Switch at period end** | Default for downgrades. $0 today; the new plan starts at renewal. |
| **Preview** | Dashboard shows cost before confirming |

## Admin billing tools

| Page | Purpose |
|---|---|
| **Invoices** | Stripe invoice list across partners |
| **Revenue** | Aggregated MRR and revenue charts |
| **Churn** | Cancellation and downgrade trends |
| **Loyalty** | View outstanding points; super admins edit earn rates and create tiers |
| **Pricing** | Configure plan prices and annual billing discounts. Drag packages to set the order used on the public pricing page. Super admins can delete any package, including built-in Basic, Core, and Pro. Restaurants already on a deleted package keep it. At least one package must remain. |

Annual billing discounts are defined in `@reservations/shared` (`annualBilling.ts`).

## Deposits

Diners may pay refundable deposits at booking:

- Stripe PaymentIntents with **manual capture**
- Webhook at `POST /webhooks/stripe` confirms holds
- Stubbed locally without `STRIPE_SECRET_KEY`

## Partner billing permissions

Only `restaurant_owner` and platform admins can manage billing (`canManageBilling()`). Managers cannot view or change subscription details.

## Stripe configuration

Production requires:

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

Webhook endpoint: `https://api.yourdomain.com/webhooks/stripe`

## Gift cards & promotions

Platform-wide promotion codes and gift cards are managed via GraphQL admin mutations and tested in `apps/api/src/__tests/`.

Partners can create restaurant-scoped promotion codes in their dashboard.

## Invoicing

Monthly restaurant invoices are generated automatically (API startup + daily 04:00 UTC) for the current and previous calendar months. Each invoice breaks down:

- The plan charge for the period (or $0 while a trial is still running)
- Cover fees grouped by source (network / website / widget), with cover count × unit rate

Unpaid auto invoices are refreshed as more covers accrue. Manual invoices (`-M` numbers) and Stripe-synced invoices are left alone.

Admins can still run **Generate** for a period on **Invoices**. Partners see the selected month’s invoice and line items on **Billing**.

Cover fees are recorded when a reservation is **completed**, then rolled into that month’s invoice. Stripe subscription renewals bill the plan separately and do **not** include cover fees. On partner **Billing**, the cover table shows covers and fee totals by source as a usage breakdown — the period invoice is the payable bill.

## Fail-to-pay (unpaid platform invoices)

Canonical policy: `docs/notes/features-billing.md`.

Unpaid invoices with a balance follow a UTC-day ladder from the **oldest unpaid due date**:

| Days past due | What happens |
|---|---|
| 0–7 | Grace. Daily card retry. Still listed. |
| 8–13 | Overdue. 1.5%/month finance charge starts (or legal max). $25 once per invoice on the first card decline. |
| 14–29 | Hidden from diner search and new online bookings. Partner Hub stays open so staff can honor existing reservations. Phone/walk-in logging still allowed. |
| 30–59 | Partner Hub limited to Billing + honoring the existing book. No new in-product reservations. Owner gets a 30-day termination notice. |
| 60+ | Subscription cancelled. Remaining upcoming diner reservations cancelled. Listing stays off until they pay everything and re-subscribe. |

Admins on the restaurant Invoices tab can pause the ladder, extend grace, waive fees, or force-restore access (force-restore pauses so the job does not immediately re-unlist). Finance charge rate and declined-card fee are on **Platform config** (`failToPay`).
