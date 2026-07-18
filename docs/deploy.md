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

## Stripe webhook

Endpoint: `POST https://api.yourdomain.com/webhooks/stripe`  
Events: `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`
