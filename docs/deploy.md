# Deploy on DigitalOcean

Production and staging run on DigitalOcean Droplets with **Dokku** (one app per `Dockerfile.*`). Dokku setup, remotes, and the full Stripe webhook event list are in `dokku/DEPLOY.md`. Keep server addresses and secrets out of this folder.

## Recommended layout

1. **Managed MongoDB** (standalone is fine; booking uses unique table slot claims).
2. **Managed Redis** for BullMQ (reminders, no-show checks) and OTP codes.
3. **Spaces** bucket for photos, videos, and 3D models.
4. Dokku apps:
   - `api` — Node service from monorepo root (`Dockerfile.api`)
   - `web` — Next.js diner app (`Dockerfile.web`)
   - `dashboard` — Next.js partner hub (`Dockerfile.dashboard`)
   - `docs` — Docusaurus static site behind an nginx access gate (`Dockerfile.docs`)

## API build / run

```
pnpm install --frozen-lockfile
pnpm --filter @reservations/shared build
pnpm --filter @reservations/api build
node apps/api/dist/index.js
```

Env: copy from `.env.example`. Set `NODE_ENV=production`, real JWT secrets, Mongo/Redis URLs, Stripe webhook secret.

Set `WEB_APP_URL` and `DASHBOARD_APP_URL` on the API for password-reset links. For transactional email, set `SENDGRID_API_KEY`.

## Web / Dashboard

```
pnpm --filter @reservations/web build
pnpm --filter @reservations/web start
```

This also builds `packages/widget` and serves `widget.js` at `https://yourdomain.com/widget.js`.

Set `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/graphql` and `NEXT_PUBLIC_WEB_URL=https://tablevera.online` (used for booking links and widget redirects).

Set `NEXT_PUBLIC_SITE_URL=https://tablevera.online` on the web build for sitemap, robots, and SEO canonical URLs.
The web app defaults to `https://tablevera.online` when the env var is unset.

For Google address autocomplete on the diner home page, also set
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (Maps JavaScript API + Places library; restrict by HTTP referrer).
The map discovery view (`/?view=map`) uses the same key for Google Maps markers.
Without the key, the location field falls back to curated US cities with nearby search.

Public restaurant pages live at `https://yourdomain.com/restaurants/{slug}`. Legacy `/r/{slug}` links permanently redirect there.

For Google / Gmail login on the diner app, set matching OAuth Web client IDs:
- API: `GOOGLE_CLIENT_ID` (and optional `GOOGLE_CLIENT_SECRET`)
- Web build: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (same value as `GOOGLE_CLIENT_ID`)

In Google Cloud Console → Credentials → OAuth 2.0 Client ID (Web), add Authorized JavaScript origins for local and production diner URLs.
## Stripe webhook

Endpoint: `POST https://api.yourdomain.com/webhooks/stripe`  
Events: deposit, SetupIntent, invoice, and subscription events — see `dokku/DEPLOY.md` for the full list. Configure a webhook per Stripe mode (`STRIPE_WEBHOOK_SECRET_TEST` / `_LIVE`).

## Docs site

The docs build is static, so every page and JS chunk is gated by nginx (`apps/docs/nginx.conf.template`), not by React:

- nginx `auth_request` calls `GET https://api.yourdomain.com/docs-access/verify` with the `tv_docs_access` cookie (successful checks cached 5s per cookie). 204 serves the file; 401 redirects pages to `/access/` and returns 401 for assets. Denials are not cached, so a revoked session stops working within about 5 seconds.
- Only `/access/` (standalone sign-in page), `/img/`, and `robots.txt` are public. All responses send `X-Robots-Tag: noindex, nofollow`.
- Set `DOCS_API_ORIGIN` on the docs app if the API is not `https://api.tablevera.online`. The cookie is scoped to the parent domain of the API's `DOCS_APP_URL` (`.tablevera.online` in production, `.tablevera.app` on staging), so docs and API must share that parent domain.

After deploying, check that a signed-out `curl -I https://docs.yourdomain.com/developers/deployment/` returns 302 to `/access/` and that any `/assets/js/*.js` chunk returns 401.

## Telegram bot

1. Create the bot via [@BotFather](https://t.me/BotFather) and set `TELEGRAM_BOT_TOKEN`.
2. In production, set `API_PUBLIC_URL=https://api.yourdomain.com` and a random `TELEGRAM_WEBHOOK_SECRET`.
3. The API registers `POST https://api.yourdomain.com/webhooks/telegram` on startup.
4. In local development, the API uses long-polling instead of a webhook.
5. Users open `@TableveraBot`, send `/start`, paste the returned Chat ID in profile settings.

The merchant messenger bot (actionable reservation cards) uses the token in Admin → Config → Messenger bot. Set `MESSENGER_BOT_WEBHOOK_BASE_URL` (https) for webhook mode at `POST /webhooks/messenger-bot`; otherwise the API long-polls.

## Partner dashboard

Set `NEXT_PUBLIC_DASHBOARD_URL` and `NEXT_PUBLIC_WEB_URL` on the dashboard build so Settings and onboarding can generate correct booking links and widget embed snippets.

Partners use `/onboarding` for the setup checklist (profile, tables/shifts, approval). Embed code, booking links, and widget theme (color, button text, reviews) are on **Booking widget** (`/booking-widget`) and in Settings.

Password reset: `/forgot-password` and `/reset-password` on the dashboard. The API sends templated emails; partners receive links to `DASHBOARD_APP_URL`, diners to `WEB_APP_URL`.

## Admin roles

- **`super_admin`** — full platform access including permanent user/restaurant delete and seed wipe (`clearSeedData`). Seed creates `a@tablevera.local` as super admin.
- **`admin`** — platform dashboard access for users, restaurants, billing, and support; cannot delete super admins or perform super-admin-only destructive actions.
- **`account_manager`** — platform operator with limited elevated-admin edits.
- **`qa`** — release testers; `/admin/qa` checklist, history, and issues only. Only a super admin can assign it.

Assign elevated roles only to trusted operators. Re-run `pnpm seed` to upgrade an existing demo admin account to `super_admin`.

Super admins can open **Developer** (`/admin/developer`) to see the API release version and which required env vars are missing on the current deployment.

## Contact form leads

Set `ELEVARO_LEADS_API_KEY`, `ELEVARO_LEADS_REFERRER_DOMAIN`, and `ELEVARO_LEADS_SOURCE` on the API to forward diner contact submissions to Elevaro Solutions. Email notifications still send via SendGrid when configured.
