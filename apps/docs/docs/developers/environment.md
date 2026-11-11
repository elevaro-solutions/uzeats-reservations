# Environment variables

Copy `.env.example` to `.env` at the repo root. Some apps also read local overrides:

| App | Local override path |
|---|---|
| API | `apps/api/.env` |
| Web | `apps/web/.env.local` |
| Dashboard | `apps/dashboard/.env.local` |

The API loads root `.env` first, then `apps/api/.env`. Non-empty local values win; empty placeholders (from a copied `.env.example`) do not wipe root values. Set `GOOGLE_CLIENT_ID` on the API and the same value as `NEXT_PUBLIC_GOOGLE_CLIENT_ID` on web, or Google sign-in shows the button and then fails with "Google OAuth is not configured".

The super-admin **Developer** page in the dashboard (`/admin/developer`) reads the canonical env registry from `@reservations/shared` and shows configured vs missing vars (secrets masked).

## Required for local development

```bash
MONGODB_URI=mongodb://127.0.0.1:27018/reservations?replicaSet=rs0&directConnection=true
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change-me-access-secret-min-32-chars!!
JWT_REFRESH_SECRET=change-me-refresh-secret-min-32-chars!
```

Also set client URLs so links and CORS work:

```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
WEB_APP_URL=http://localhost:3000
DASHBOARD_APP_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:4000/graphql
NEXT_PUBLIC_WS_URL=ws://localhost:4000/graphql
```

## Auth providers

| Variable | Used by | Notes |
|---|---|---|
| `GOOGLE_CLIENT_ID` | API | Verifies Google ID tokens |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Web | Must match `GOOGLE_CLIENT_ID` |
| `TWILIO_*` | API | Phone OTP via Verify |
| `AUTH_DEV_OTP=true` | API | Accept code `123456` without Twilio |

## Stripe

The API keeps separate sandbox (`_TEST`) and live (`_LIVE`) keys. **Admin → Config → Billing** picks the active mode, and clients load the matching publishable key from the API.

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY_TEST` / `STRIPE_SECRET_KEY_LIVE` | API — PaymentIntents, SetupIntents, subscriptions, invoices |
| `STRIPE_WEBHOOK_SECRET_TEST` / `STRIPE_WEBHOOK_SECRET_LIVE` | Webhook signature check (required in production) |
| `STRIPE_PUBLISHABLE_KEY_TEST` / `STRIPE_PUBLISHABLE_KEY_LIVE` | Served to web + dashboard Stripe.js |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Legacy fallback, used only when the key prefix matches the requested mode |

Without Stripe keys, deposits and billing flows are stubbed for local dev. Stored `cus_` / `sub_` / `pi_` IDs are not migrated between modes.

## Storage (DigitalOcean Spaces)

| Variable | Purpose |
|---|---|
| `DO_SPACES_KEY` / `DO_SPACES_SECRET` | S3-compatible credentials |
| `DO_SPACES_BUCKET` | Bucket name |
| `DO_SPACES_CDN` | Public CDN base URL. When empty, image URLs use `https://<bucket>.<region>.cdn.digitaloceanspaces.com` |

Uploads are stubbed when keys are missing.

## Notifications

| Variable | Channel |
|---|---|
| `SENDGRID_API_KEY` | Transactional email |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_WEBHOOK_SECRET` | Legacy Telegram alerts bot |
| `API_PUBLIC_URL` | Telegram webhook registration |
| `MESSENGER_BOT_WEBHOOK_BASE_URL` | Merchant messenger bot webhook mode (https); unset = long polling. The bot token itself is in Admin → Config |
| `VAPID_*` | Web push notifications |
| `TWILIO_*` | SMS (transactional + opt-in at `/sms`) |
| `ELEVARO_LEADS_*` | Forward diner contact-form leads |

## AI and 3D (optional)

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Review reply drafts and package descriptions (Google AI Studio free tier) |
| `GEMINI_MODEL` | Defaults to `gemini-3.5-flash-lite`. Override if Google renames free-tier models |
| `KIRI_ENGINE_API_KEY` | Virtual 3D room scans from walkthrough video or photos |

Without `GEMINI_API_KEY`, `generateReviewReplyDraft` still returns a templated draft. Drafts are not posted until `replyToReview`. Without `KIRI_ENGINE_API_KEY`, owners do not see scan uploads and the room is procedural + photos only.

## Docs site

| Variable | Where | Purpose |
|---|---|---|
| `DOCS_API_URL` | Docs build (`Dockerfile.docs` build arg) | GraphQL URL the docs client calls |
| `DOCS_API_ORIGIN` | Docs container (runtime) | API origin nginx calls at `/docs-access/verify` to check every request; also served to the sign-in page. Defaults to `https://api.tablevera.online` |

## SEO & public URLs

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap (defaults to `https://tablevera.online`) |
| `NEXT_PUBLIC_WEB_URL` | Booking links, widget redirects |
| `NEXT_PUBLIC_DASHBOARD_URL` | Partner dashboard links in emails |

## Design

| Variable | Values |
|---|---|
| `NEXT_PUBLIC_COLOR_PALETTE` | `1` = Forest & Gold (default), `2` = Terracotta & Amber |

## Password reset

Set on the **API** so reset emails link to the correct app:

```bash
WEB_APP_URL=http://localhost:3000
DASHBOARD_APP_URL=http://localhost:3001
```

## Mobile

```bash
EXPO_PUBLIC_API_URL=http://localhost:4000/graphql
EXPO_PUBLIC_COLOR_PALETTE=1
```

Use your machine's LAN IP instead of `localhost` when testing on a physical device.
