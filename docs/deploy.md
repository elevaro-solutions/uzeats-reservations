# Deploy on DigitalOcean

## Recommended layout

1. **Managed MongoDB** (standalone is fine; booking uses unique table slot claims).
2. **Managed Redis** for BullMQ (reminders, no-show checks).
3. **Spaces** bucket for restaurant/menu photos.
4. **App Platform** services:
   - `api` — Node service from monorepo root
   - `web` — Next.js diner app
   - `dashboard` — Next.js partner hub

## API build / run

```
pnpm install --frozen-lockfile
pnpm --filter @reservations/shared build
pnpm --filter @reservations/api build
node apps/api/dist/index.js
```

Env: copy from `.env.example`. Set `NODE_ENV=production`, real JWT secrets, Mongo/Redis URLs, Stripe webhook secret.

## Web / Dashboard

```
pnpm --filter @reservations/web build
pnpm --filter @reservations/web start
```

Set `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/graphql`.

For Google address autocomplete on the diner home page, also set
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (Maps JavaScript API + Places library; restrict by HTTP referrer).
Without the key, the location field falls back to curated US cities with nearby search.

For Google / Gmail login on the diner app, set matching OAuth Web client IDs:
- API: `GOOGLE_CLIENT_ID` (and optional `GOOGLE_CLIENT_SECRET`)
- Web build: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (same value as `GOOGLE_CLIENT_ID`)

In Google Cloud Console → Credentials → OAuth 2.0 Client ID (Web), add Authorized JavaScript origins for local and production diner URLs.
## Stripe webhook

Endpoint: `POST https://api.yourdomain.com/webhooks/stripe`  
Events: `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`

## Telegram bot

1. Create the bot via [@BotFather](https://t.me/BotFather) and set `TELEGRAM_BOT_TOKEN`.
2. In production, set `API_PUBLIC_URL=https://api.yourdomain.com` and a random `TELEGRAM_WEBHOOK_SECRET`.
3. The API registers `POST https://api.yourdomain.com/webhooks/telegram` on startup.
4. In local development, the API uses long-polling instead of a webhook.
5. Users open `@TableveraBot`, send `/start`, paste the returned Chat ID in profile settings.
