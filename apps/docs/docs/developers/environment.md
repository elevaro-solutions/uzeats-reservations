# Environment variables

Copy `.env.example` to `.env` at the repo root. Some apps also read local overrides:

| App | Local override path |
|---|---|
| API | `apps/api/.env` |
| Web | `apps/web/.env.local` |
| Dashboard | `apps/dashboard/.env.local` |

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

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | API — PaymentIntents, subscriptions |
| `STRIPE_WEBHOOK_SECRET` | Required in production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Web + dashboard Stripe.js |

Without Stripe keys, deposits and billing flows are stubbed for local dev.

## Storage (DigitalOcean Spaces)

| Variable | Purpose |
|---|---|
| `DO_SPACES_KEY` / `DO_SPACES_SECRET` | S3-compatible credentials |
| `DO_SPACES_BUCKET` | Bucket name |
| `DO_SPACES_CDN` | Public CDN base URL for images |

Uploads are stubbed when keys are missing.

## Notifications

| Variable | Channel |
|---|---|
| `SENDGRID_API_KEY` (or `RESEND_API_KEY`) | Transactional email |
| `TELEGRAM_BOT_TOKEN` | Telegram bot |
| `API_PUBLIC_URL` | Telegram webhook registration |
| `VAPID_*` | Web push notifications |
| `TWILIO_*` | SMS (transactional + opt-in at `/sms`) |

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
