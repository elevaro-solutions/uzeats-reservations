# Billing & plans

Tablevera uses **Stripe** for partner subscriptions, deposits, and invoicing.

## Subscription plans

Plan definitions live in `apps/api/src/config/plans.ts`. Each plan includes:

- Monthly price
- Feature flags (table limits, campaign access, etc.)
- Trial period (when applicable)

Partners choose a plan during signup or change plans in **Settings → Billing**.

## Plan changes

Policy implemented in `apps/api/src/services/planChangePolicy.ts`:

| Change type | Behavior |
|---|---|
| **Upgrade** | Prorated charge immediately |
| **Downgrade** | Scheduled for end of billing period |
| **Preview** | Dashboard shows cost before confirming |

## Admin billing tools

| Page | Purpose |
|---|---|
| **Invoices** | Stripe invoice list across partners |
| **Revenue** | Aggregated MRR and revenue charts |
| **Churn** | Cancellation and downgrade trends |
| **Pricing** | Configure plan prices and annual billing discounts |

Annual billing discounts are defined in `@reservations/shared` (`annualBilling.ts`).

## Deposits

Diners may pay refundable deposits at booking:

- Stripe PaymentIntents with **manual capture**
- Webhook at `POST /webhooks/stripe` confirms holds
- Stubbed locally without `STRIPE_SECRET_KEY`

## Partner billing permissions

Only `restaurant_owner` and platform admins can manage billing (`canManageBilling()`). Staff cannot view or change subscription details.

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

Stripe generates invoices for subscriptions. The admin **Invoices** page surfaces them for support and accounting.
