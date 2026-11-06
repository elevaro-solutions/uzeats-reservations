# Billing & plans

Tablevera uses **Stripe** for partner subscriptions, deposits, and invoicing.

## Subscription plans

Built-in plan defaults live in `apps/api/src/config/plans.ts`; admins edit the live catalog on **Admin → Pricing**. Each package includes:

- Price and **billing duration** (number + day / week / month / year, e.g. 14 days or 3 months). Public `/pricing` and plan pickers show the duration (e.g. `/ 14 days`); annual billing only applies to 1-month packages
- Feature flags (table limits, campaigns, floor plans, 3D view, etc.)
- **Team seats** (`managerSeats`) — how many managers and hosts the owner can invite (minimum 1; Basic 1 / Core 3 / Pro 5 by default). The owner does not use a seat
- Trial period (30 days on paid plans)

**Base** is a $0 plan with a per-cover fee on network and website bookings, so a restaurant can stay listed without a subscription. Free plans have no paid cycle; switching off Base starts the new plan right away.

Packages marked **Hidden** stay available to platform admins (restaurant create/edit, package assignment, invoices) but are not returned to partners or the public. **Featured / popular** highlights one package on public `/pricing`. Plans & pricing also sets how many packages the public page shows at once (default 3) and whether the **Compare all features** table appears.

Partners choose a plan during signup or change plans in **Billing**. Superadmins can set a restaurant's paid period start on **Admin → Restaurants → Package** (a future date means trial until the first charge).

## Plan changes

Policy implemented in `apps/api/src/services/planChangePolicy.ts`:

| Change type | Behavior |
|---|---|
| **Switch right away** | Charge the **full** new monthly price today (not a prorated difference). Unused time on the current plan is not credited. A new billing period starts now. |
| **Switch at period end** | Default for downgrades. $0 today; the new plan starts at renewal. |
| **Preview** | Dashboard compares current and new price and lists gained or lost features |

Upgrades start immediately and clear a scheduled cancel. **Cancel** keeps access until the paid period ends; **Resume** restores renewal. The cancel dialog offers **Switch to Base** instead.

## Default payment card

Each venue has one **default card**, shown on Billing → **Default payment method** (brand, last 4, expiry). Owners add or replace it through Stripe. Cards saved at signup or when adding a restaurant count as the default. It is auto-charged for:

- Subscription renewals
- Monthly cover-fee invoices
- Paid extras (SMS credits, Virtual 3D room)

Saving or replacing the card retries open invoices and an unpaid renewal right away. Owners get a reminder about 3 days before a trial ends if no card is on file, and a warning about 30 days before the card expires. When the bank asks to confirm a renewal (3D Secure), the owner gets a **Confirm payment** link.

### Failed charges

| Who retries | When |
|---|---|
| Stripe | Subscription renewals (Smart Retries). The daily job does not charge renewals a second time |
| Daily billing job | Platform invoices on days 0, 1, 3, 5, and 7 after the due date, then weekly; at most once a day |

A lost, stolen, or expired card pauses retries until the owner replaces it. On the first failure the owner gets an email and in-app alert with the bank's reason, the next retry date, and **Replace card** / **Pay now** links; Billing and invoice detail show a red **Automatic charge failed** banner. Admins and account managers get `billing_admin_alert` on the first failure and when a venue is hidden, restricted, or terminated for non-payment.

## Paying invoices

Billing → **Pay all invoices** settles every open invoice for the selected restaurant (or every restaurant under **All restaurants**) in one charge. `/billing/unpaid` lists every open invoice. Each platform invoice also has a matching Stripe hosted invoice.

## Admin billing tools

| Page | Purpose |
|---|---|
| **Invoices** | Platform invoice list across partners, month insights (subscriptions, Virtual 3D, other services), recent transactions |
| **Failed charges** | Restaurant, invoice, amount, reason, attempts, last attempt, and next retry |
| **No-show fees** | Collected card-guarantee fees with totals and charge / refund actions |
| **Revenue** | Aggregated MRR and revenue charts |
| **Churn** | Cancellation and downgrade trends |
| **Loyalty** | View outstanding points; super admins edit earn rates and create tiers |
| **Pricing** | Configure plan prices and annual billing discounts. Drag packages to set the order used on the public pricing page. Super admins can delete any package, including built-in Basic, Core, and Pro. Restaurants already on a deleted package keep it. At least one package must remain. |

Annual billing discounts are defined in `@reservations/shared` (`annualBilling.ts`).

## Deposits

Restaurants pick a deposit policy (Booking policies → Deposit policy). Tables can override the per-guest amount (max $100,000).

| Policy | At booking | Later |
|---|---|---|
| **Card guarantee** (default) | Diner saves a card (Stripe SetupIntent); nothing charged | Fee charged off-session for a no-show or a cancel inside the cancel window (24 hours by default) |
| **Prepaid** | Amount charged now and applied to the bill | Refunded in full if the diner cancels in time or the restaurant cancels |

Packages, private dining, and experiences are always charged at booking. Stubbed locally without Stripe keys.

## Partner billing permissions

Only `restaurant_owner` and platform admins can manage billing (`canManageBilling()`). Managers and hosts cannot view or change subscription details.

## Stripe configuration

The API holds separate sandbox and live keys; **Admin → Config → Billing** switches the active mode (super admin only). See [Environment variables](/developers/environment) for the variable names. Real key values live only in the server environment, never in docs or the repo.

Webhook endpoint: `https://api.<your-domain>/webhooks/stripe`

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
| 0–7 | Grace. Card retries on days 0, 1, 3, 5, and 7. Still listed. |
| 8–13 | Overdue. 1.5%/month finance charge starts (or legal max). $25 once per invoice on the first card decline. |
| 14–29 | Hidden from diner search and new online bookings. Partner Hub stays open so staff can honor existing reservations. Phone/walk-in logging still allowed. |
| 30–59 | Partner Hub limited to Billing + honoring the existing book. No new in-product reservations. Owner gets a 30-day termination notice. |
| 60+ | Subscription cancelled. Remaining upcoming diner reservations cancelled. Listing stays off until they pay everything and re-subscribe. |

Admins on the restaurant Invoices tab can pause the ladder, extend grace, waive fees, or force-restore access (force-restore pauses so the job does not immediately re-unlist). Finance charge rate and declined-card fee are on **Platform config** (`failToPay`).
