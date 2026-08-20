# Integrations

External services Tablevera connects to and how they degrade without credentials.

## Stripe

| Use case | API |
|---|---|
| Partner subscriptions | Checkout / Billing Portal |
| Deposits | PaymentIntents (manual capture) |
| Invoices | Stripe Invoice objects |

**Webhook:** `POST /webhooks/stripe`  
**Stub behavior:** Mutations succeed with fake IDs when `STRIPE_SECRET_KEY` is unset.

## Twilio

| Use case | Product |
|---|---|
| Phone login OTP | Verify |
| Transactional SMS | Messaging (with opt-in) |

**Dev mode:** `AUTH_DEV_OTP=true` accepts code `123456`.

## Google

| Use case | Key |
|---|---|
| Gmail login | OAuth Client ID (API + web must match) |
| Address autocomplete | Maps JavaScript + Places API |
| Map discovery view | Same Maps key |

Falls back to plain text inputs and city list without Maps key.

## DigitalOcean Spaces

S3-compatible object storage for restaurant and menu images.

Flow:

1. Client requests presigned URL via API
2. Direct upload to Spaces
3. Document stores CDN URL

**Stub behavior:** Upload mutations return placeholder URLs without credentials.

## SendGrid / Resend

Transactional email. SendGrid preferred; Resend is fallback when SendGrid key absent.

## Telegram

Optional bot for reservation alerts. Requires public API URL for webhook registration in production.

## Elevaro leads

Contact form on diner web can POST leads to Elevaro when `ELEVARO_LEADS_API_KEY` is set.

## Embeddable widget

`packages/widget` loads on partner websites:

```html
<script src="https://tablevera.online/widget.js"
        data-restaurant-slug="your-slug"
        data-api-url="https://api.tablevera.online/graphql"></script>
```

Built during web app deploy; partners copy snippet from dashboard **Booking widget** page.

## Webhooks summary

| Endpoint | Provider |
|---|---|
| `/webhooks/stripe` | Stripe |
| `/webhooks/telegram` | Telegram |

## Env var registry

All integration env vars are cataloged in `packages/shared/src/envVars.ts` and surfaced on the admin Developer page with per-app scope labels.

## Adding a new integration

1. Add env definitions to `packages/shared/src/envVars.ts`
2. Implement service in `apps/api/src/services/`
3. Wire resolver or route
4. Document stub behavior for local dev
5. Update [Environment variables](/developers/environment) and this page
