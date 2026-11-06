# Deployment

Production runs on **DigitalOcean**: a Droplet running **Dokku** (one app per service, built from the repo `Dockerfile.*`), plus managed MongoDB, Redis, and Spaces. A separate staging Dokku host mirrors the same apps.

Server addresses, SSH access, and secrets are not documented here. Ask the platform owner, and keep them out of this site and the repo.

## Services

| Dokku app | Dockerfile | Serves |
|---|---|---|
| api | `Dockerfile.api` | GraphQL API, webhooks, uploads, workers (port 4000) |
| web | `Dockerfile.web` | Diner Next.js site and `/widget.js` |
| dashboard | `Dockerfile.dashboard` | Partner Hub |
| docs | `Dockerfile.docs` | This site (static Docusaurus build behind nginx) |

Data services:

1. **Managed MongoDB** — standalone or replica set (booking uses unique slot claims, not transactions requiring a full RS in all paths)
2. **Managed Redis** — BullMQ job queues and OTP codes
3. **Spaces bucket** — photos, videos, and 3D models with CDN URL

## Deploying

Releases go through the repo git-push workflow (version bump, changelog, Partner Hub QA tasks), then push to the Dokku remotes. Dokku-specific setup is in `dokku/DEPLOY.md`. Builds raise the Node heap to 4 GB so `tsc` and Next do not run out of memory.

## Build commands

### API

```bash
pnpm install --frozen-lockfile
pnpm --filter @reservations/shared build
pnpm --filter @reservations/api build
node apps/api/dist/index.js
```

Set `NODE_ENV=production`, real JWT secrets, Mongo/Redis URLs, and the Stripe webhook secrets. Optional `GEMINI_API_KEY` enables personalized review reply drafts (templated without it). The API image includes `CHANGELOG.md` so Admin → Developer shows the deployed version.

### Web

```bash
pnpm --filter @reservations/web build
pnpm --filter @reservations/web start
```

This also builds `packages/widget` and serves `/widget.js` for partner embeds.

Key env vars:

```bash
NEXT_PUBLIC_API_URL=https://api.<your-domain>/graphql
NEXT_PUBLIC_SITE_URL=https://tablevera.online
NEXT_PUBLIC_WEB_URL=https://tablevera.online
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<same as API GOOGLE_CLIENT_ID>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<Maps JS + Places, restricted by HTTP referrer>
```

### Dashboard

```bash
pnpm --filter @reservations/dashboard build
pnpm --filter @reservations/dashboard start
```

```bash
NEXT_PUBLIC_API_URL=https://api.<your-domain>/graphql
NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.<your-domain>
```

### Docs

```bash
pnpm --filter @reservations/docs build
```

The docs image serves `apps/docs/build/` with nginx (`apps/docs/nginx.conf.template`). nginx is the access gate, not the React app:

- Every page and `/assets/*` chunk goes through `auth_request` to the API's `GET /docs-access/verify`, which checks the `tv_docs_access` cookie and that the email is still approved. Results are cached for 60 seconds per cookie
- Signed-out visitors get a redirect to `/access/` (a standalone sign-in page); asset requests get 401
- Only `/access/`, `/img/`, and `robots.txt` are public. Every response sends `X-Robots-Tag: noindex, nofollow`
- Set `DOCS_API_ORIGIN` on the docs app when the API is not `https://api.tablevera.online`

The `tv_docs_access` cookie is set for `.tablevera.online`, so the docs site and API must share that parent domain.

## Stripe webhook

```
POST https://api.<your-domain>/webhooks/stripe
```

- Deposits: `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, `payment_intent.canceled`, `setup_intent.succeeded`, `charge.refunded`
- Subscriptions and invoices: `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, `invoice.finalized`, `invoice.voided`, `invoice.updated`, `customer.subscription.updated`, `customer.subscription.deleted`

## Telegram bots

- **Legacy alerts:** create a bot via [@BotFather](https://t.me/BotFather), set `TELEGRAM_BOT_TOKEN`, `API_PUBLIC_URL`, and `TELEGRAM_WEBHOOK_SECRET`. The API registers the webhook on startup in production
- **Merchant messenger bot:** token in Admin → Config → Messenger bot. Set `MESSENGER_BOT_WEBHOOK_BASE_URL` for webhook mode (`POST /webhooks/messenger-bot`); otherwise the API long-polls

## Widget embed

Partners copy embed code from **Booking widget** in the dashboard. The widget defaults to `https://api.tablevera.online/graphql`; override with `data-api-url` on the script tag.

## Full reference

The repo root `docs/deploy.md` covers Google OAuth origins, SMS opt-in, and SEO configuration.
