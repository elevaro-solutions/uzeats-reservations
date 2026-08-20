# Deployment

Production runs on **DigitalOcean** (App Platform or Droplets) with managed MongoDB, Redis, and Spaces.

## Recommended infrastructure

1. **Managed MongoDB** — standalone or replica set (booking uses unique slot claims, not transactions requiring a full RS in all paths)
2. **Managed Redis** — BullMQ job queues
3. **Spaces bucket** — restaurant and menu photos with CDN URL
4. **Three app services:**
   - `api` — Node on port 4000
   - `web` — Next.js on port 3000
   - `dashboard` — Next.js on port 3001

Optional: deploy `apps/docs` as a static site (Docusaurus build output).

## Build commands

### API

```bash
pnpm install --frozen-lockfile
pnpm --filter @reservations/shared build
pnpm --filter @reservations/api build
node apps/api/dist/index.js
```

Set `NODE_ENV=production`, real JWT secrets, Mongo/Redis URLs, and `STRIPE_WEBHOOK_SECRET`.

### Web

```bash
pnpm --filter @reservations/web build
pnpm --filter @reservations/web start
```

This also builds `packages/widget` and serves `/widget.js` for partner embeds.

Key env vars:

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/graphql
NEXT_PUBLIC_SITE_URL=https://tablevera.online
NEXT_PUBLIC_WEB_URL=https://tablevera.online
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<same as API GOOGLE_CLIENT_ID>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<Maps JS + Places>
```

### Dashboard

```bash
pnpm --filter @reservations/dashboard build
pnpm --filter @reservations/dashboard start
```

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/graphql
NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.yourdomain.com
```

### Docs

```bash
pnpm --filter @reservations/docs build
# Serve static files from apps/docs/build/
```

## Stripe webhook

```
POST https://api.yourdomain.com/webhooks/stripe
```

Events: `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, subscription lifecycle events.

## Telegram bot

1. Create bot via [@BotFather](https://t.me/BotFather)
2. Set `TELEGRAM_BOT_TOKEN`, `API_PUBLIC_URL`, and `TELEGRAM_WEBHOOK_SECRET`
3. API registers webhook on startup in production

## Widget embed

Partners copy embed code from **Booking widget** in the dashboard. The widget defaults to `https://api.tablevera.online/graphql`; override with `data-api-url` on the script tag.

## Dokku

See `dokku/DEPLOY.md` for Dokku-specific instructions.

## Full reference

The repo root `docs/deploy.md` contains extended DigitalOcean setup including Google OAuth origins, SMS opt-in, and SEO configuration.
