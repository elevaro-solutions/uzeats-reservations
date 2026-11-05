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

**Failed charges:** Each venue has one default card (`Subscription.preferredPaymentMethodId`).

- **Who retries:** Stripe retries renewals (Smart Retries). The daily job retries platform invoices on days 0, 1, 3, 5, and 7 after the due date, then weekly. It tries at most once per day and never on API startup.
- **Hard declines:** a lost, stolen, or expired card pauses retries until the owner replaces the card. Replacing the card retries open charges right away.
- **Notifications:** the owner gets `card_charge_failed` on the first failure and on a hard decline. Admins and account managers get `billing_admin_alert` on the first failure and when a venue is hidden, restricted, or terminated. Both always go by email and in-app, even if the owner muted billing updates.
- **Other notices:** owners also get `card_expiring` and `trial_card_missing`.
- **Webhook events:** see `dokku/DEPLOY.md`.

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

## Gemini

Optional **review reply drafts** for partners (`generateReviewReplyDraft`).

- Set `GEMINI_API_KEY` (Google AI Studio). Default model `gemini-3.5-flash-lite` (`GEMINI_MODEL` override).
- **Stub behavior:** Without a key, the mutation returns a templated draft. Nothing is posted until `replyToReview`.

## DigitalOcean Spaces

S3-compatible object storage. The API uploads the bytes (browser PUT to the bucket is not used) and stores the CDN URL.

New objects use a folder prefix:

| Prefix | Contents |
|---|---|
| `restaurants/{id}/branding` | Logo and gallery |
| `restaurants/{id}/menu` | Dish photos |
| `restaurants/{id}/floor` | Floor-plan and table photos |
| `restaurants/{id}/experiences` | Experience covers |
| `restaurants/{id}/packages` | Occasion package photos |
| `restaurants/{id}/virtual-room` | Walkthrough photos, video, and the generated `.glb` |
| `restaurants/{id}/reviews` | Diner review photos |
| `accounts/{userId}/avatar` | Profile photo |
| `accounts/{userId}/support` | Support attachments |
| `accounts/{userId}/drafts` | Photos uploaded before a restaurant id exists |
| `platform/blog`, `platform/discovery`, `platform/table-shapes` | Platform assets |

Older files remain under `uploads/`.

**Stub behavior:** Without Spaces credentials, files are written under `.data/uploads` and served from `GET /api/uploads/local/*`.

## SendGrid

Transactional email via `SENDGRID_API_KEY`. Without the key, the API stubs sends in development.

## Telegram

Two bots:

| Bot | Config | Purpose |
|---|---|---|
| Legacy alerts | `TELEGRAM_BOT_TOKEN` + `/webhooks/telegram` | Plain text to `User.telegramChatId` |
| Merchant messenger | Platform Config token + `/webhooks/messenger-bot` | Actionable reservation cards (Accept / Reject / Seat / …) |

Merchant bot: connect token in Admin → Config → Messenger bot. Set `MESSENGER_BOT_WEBHOOK_BASE_URL` (https) for webhook mode; otherwise the API long-polls.

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
| `/webhooks/telegram` | Telegram (legacy chat-id alerts) |
| `/webhooks/messenger-bot` | Telegram (merchant messenger bot) |

## Env var registry

All integration env vars are cataloged in `packages/shared/src/envVars.ts` and surfaced on the admin Developer page with per-app scope labels.

## Adding a new integration

1. Add env definitions to `packages/shared/src/envVars.ts`
2. Implement service in `apps/api/src/services/`
3. Wire resolver or route
4. Document stub behavior for local dev
5. Update [Environment variables](/developers/environment) and this page
