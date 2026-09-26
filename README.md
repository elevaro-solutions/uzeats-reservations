# Tablevera

OpenTable-style restaurant reservation platform for the USA market.

Primary domain: [https://tablevera.online](https://tablevera.online)

See [CHANGELOG.md](./CHANGELOG.md) for release history.

**Documentation:** [apps/docs](./apps/docs) — Docusaurus site with guides for developers, diners, managers, admins, architecture, and LLM agents. Access is gated (request + OTP for approved emails). Run locally at http://localhost:3002 (`pnpm --filter @reservations/docs dev`).

## Monorepo

| App / package | Port | Description |
|---|---|---|
| `apps/api` | 4000 | Apollo GraphQL API + BullMQ workers |
| `apps/web` | 3000 | Diner-facing Next.js app |
| `apps/dashboard` | 3001 | Restaurant partner + platform admin |
| `apps/mobile` | Expo | React Native diner app |
| `apps/merchant-mobile` | Expo | React Native partner ops app |
| `apps/docs` | 3002 | Docusaurus documentation site |
| `packages/shared` | — | Zod schemas, constants, types |
| `packages/ui` | — | Design tokens, Ant Design theme, shared components |
| `packages/widget` | — | Embeddable booking widget |

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (MongoDB + Redis)

Diner web and partner dashboard run on **Next.js 16**, **React 19**, **Ant Design 6**, and **Apollo Client 4**.

## Quick start

```bash
# 1. Install
pnpm install

# 2. Env
cp .env.example .env
# Also copy into apps that need local env if desired:
# cp .env apps/api/.env

# 3. Infrastructure
pnpm db:up

# 4. Build shared package
pnpm --filter @reservations/shared build

# 5. Seed demo data
pnpm seed
# Clear demo data only (keeps admin accounts): pnpm seed -- --clear

# 6. Run web apps (API, diner web, dashboard, docs)
pnpm dev
```

- Diner web: http://localhost:3000  
- Partner dashboard: http://localhost:3001  
- GraphQL: http://localhost:4000/graphql  
- Mobile: `pnpm dev:mobile`
- Docs: http://localhost:3002 (`pnpm --filter @reservations/docs dev`)

## Demo accounts

Password for all: `Password123!`

| Email | Role |
|---|---|
| `diner@tablevera.local` | Diner (750 loyalty points) |
| `owner@tablevera.local` | Restaurant owner |
| `a@tablevera.local` | Super admin (platform operator) |

Phone OTP (dev): any phone + code `123456` when `AUTH_DEV_OTP=true`.

## Features

- Restaurant search (city, cuisine, text, nearby geo) with **list and map views**, infinite scroll, SEO landing pages (city/state/cuisine/occasion/neighborhood/landmark hubs, cuisine×city, near-me, top/best restaurants), and live availability slots — taxonomy managed in admin **Discovery**
- **Blog** — published articles with SEO metadata; platform admins manage posts in the dashboard
- **For restaurants** marketing page (`/for-restaurants`) plus public pricing and contact-sales flows
- **Bookmarks/Saved** — diners can save favorite restaurants and view them at `/saved`
- **Restaurant inquiries** — contact restaurants directly from the detail page
- Google Places address autocomplete and device near-me (falls back to curated US cities)
- Concurrent-safe booking via atomic table slot claims (no replica set required); optional **manual approval** for online bookings (party-size and per-resource rules)
- Deposits via Stripe PaymentIntents (manual capture; stubbed without keys); partners/admins can release holds or refund captured deposits (partial refunds supported) with a required reason
- **Restaurant packages** — occasion/party-sized add-ons partners manage in the dashboard and diners select at booking
- Waitlist + auto-notify on cancellation; **favorite availability alerts** when a near-term table opens
- Platform + per-restaurant loyalty (tiers, referrals, expiry) with gift cards and promotion codes; super admins edit platform point packages and diner tiers on **Loyalty**
- Reviews after past visits (completed, or confirmed/seated after the slot ends) with Overall, Food, Service, and Atmosphere ratings plus up to 3 photos; diners see Leave a review on the restaurant page and **My reviews** (`/reviews`); partners reply from dashboard **Reviews**, can report for moderation, and can add diner photos to the gallery (optional Gemini draft via `GEMINI_API_KEY`)
- Menus + DO Spaces uploads (local `.data/uploads` fallback without Spaces keys; image types only)
- Notifications: email (SendGrid) with booking confirmation `.ics` attachments plus Google Calendar and View reservation links, Telegram bot, web/Expo push (mobile soft-prompts after booking/waitlist; service worker on diner web), in-app inbox + channel prefs; transactional SMS with public `/sms` opt-in
- Auth: email/password (forgot/reset on web and partner dashboard), Google OAuth, Twilio phone OTP; browser sessions use HttpOnly cookies; mobile diner app uses SecureStore JWTs with Google Sign-In
- Partner **Settings** hub of setup tools; **Restaurant profile** (`/restaurant-profile`) holds listing, photos, contact, deposits, loyalty, widget, public URL, and operations; **Team** invites managers within package **manager seats**; notifications prefs, **Reviews** (reply, report, Gemini draft), multi-restaurant selector, self-registration with Stripe card collection, **add restaurant requires a payment method** (including during a free trial), plan change preview (prorated upgrades / scheduled downgrades), onboarding checklist, **Grow → Public profile** (change requests), **public URL slug change requests**, toggles to accept online reservations or hide the booking widget, **Support** tickets (rich text + screenshots), and **DoorDash/Uber Eats import** (saved `.mhtml`/`.html` page, including menu photos) from Settings, profile, register, and admin restaurant create
- **Email branding** — customizable email templates per restaurant
- Shareable booking links (`/restaurants/:slug`) and **Booking widget** page for embed script copy and theme (color, button text, reviews)
- Owner phone / walk-in bookings, **diner and partner reservation edit**, reservation-scoped messaging, and **individual reservation detail pages** (partner list: status + date presets + custom range export Excel/PDF/JSON; cancel requires a preset reason + optional message; diner upcoming / past / deposit filters) plus diner **billing history** (`/billing`); bookings can attach **experiences** and private dining spaces
- Partner **My restaurants** multi-location overview alongside the home dashboard; **Grow** and **Insights** hubs for marketing and analytics; **page search** (⌘K / Ctrl+K) jumps to partner or admin pages, settings tools, and restaurants
- Partner **Live floor** (per-area grids, silent 30s poll); **Table layout** and **Tables & shifts** live under the Settings hub
- Enhanced restaurant detail pages with **logo**, photo gallery, reviews, FAQ, terms, about, **popular dishes** (up to 10), reservation windows (no timezone suffix), a Google Maps address link, **private dining** and **experiences** sections (when configured; experiences enforce min/max guests), and a dedicated **experience booking** flow; booking dates and times use the restaurant’s local calendar
- Platform admin: **diners / restaurant owners / managers** (separate list + detail pages with diner reservations, reviews, points, and notification settings; create, edit, invite, venue assignment, impersonation that opens the diner app, password reset) plus platform users, restaurants (list + **detail manage** for menu/reservations/reviews/invoices/package/booking widget/team/tables/shifts, **bulk status/delete**, **public URL slugs**, **View as diner**), **Reservations** (all bookings), **URL slug requests**, **public profile requests**, **Tickets** (partner support queue), **Billing** and **Platform** hubs (invoices, revenue, loyalty, exports, config, discovery, templates, …), **Loyalty** (stats + super-admin program editor), exports (CSV/Excel/JSON/PDF, diner search and restaurant guest CRM), support, moderation, **TipTap email templates** with preview, config, annual billing discounts, **docs access** requests, and richer audit log filters
- Embeddable booking widget with per-restaurant theme
- Public contact form (diner support path), cookie consent, and legal pages (privacy, terms, SMS messaging/opt-in, cookies)
- Super-admin developer page for deployment env-var health (secret values masked)

## Design system

Visual language lives in [`packages/ui`](./packages/ui): shared Tablevera brand components, swappable palettes (Forest & Gold or Terracotta & Amber), Plus Jakarta Sans, and Ant Design theme. Set `NEXT_PUBLIC_COLOR_PALETTE` (`1` or `2`). See [`packages/ui/DESIGN.md`](./packages/ui/DESIGN.md).

## Environment

See [`.env.example`](.env.example). Required for local:

```
MONGODB_URI=mongodb://127.0.0.1:27018/reservations?replicaSet=rs0&directConnection=true
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
```

Optional integrations: `STRIPE_*` (production requires `STRIPE_WEBHOOK_SECRET`), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (web + dashboard Stripe.js for deposits and partner signup/billing), `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (mobile Stripe deposits in booking), `TWILIO_*`, `GOOGLE_CLIENT_ID` + `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Gmail login; must match), `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (mobile Google Sign-In; web client ID must match API `GOOGLE_CLIENT_ID`), `EXPO_PUBLIC_API_URL` (mobile GraphQL; default `http://localhost:4000/graphql`), `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` / `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (web and mobile Places address autocomplete), `SENDGRID_API_KEY`, `GEMINI_API_KEY` (optional personalized review reply drafts; templated draft without it), `TELEGRAM_BOT_TOKEN` (+ `API_PUBLIC_URL` / `TELEGRAM_WEBHOOK_SECRET` in production when the bot is enabled), `DO_SPACES_*`, `VAPID_*` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (web diner Push toggle; must match API `VAPID_PUBLIC_KEY`), `NEXT_PUBLIC_SITE_URL` (canonical URLs for sitemap/SEO; defaults to `https://tablevera.online`), `MAGNIFIC_API_KEY` (discovery hub stock thumbnails), `ELEVARO_LEADS_API_KEY` (contact form lead ingest), `ELEVARO_NOTIFIER_*` (optional manager reservation alerts via `@elevaro_merchant_bot`). Dashboard only: `NEXT_PUBLIC_SHOW_DEV_CREDENTIALS=true` shows seed login hints on `/login`.

For password reset emails, set `WEB_APP_URL` and `DASHBOARD_APP_URL` on the API so reset links land on the correct app. For the docs site, set `DOCS_APP_URL` on the API and `DOCS_API_URL` on the docs build (GraphQL endpoint).

## Deploy notes (DigitalOcean)

Full steps: [`docs/deploy.md`](./docs/deploy.md).

1. **Managed MongoDB** — standalone or replica set both work (booking uses unique slot claims).
2. **Managed Redis** — for BullMQ reminder / no-show jobs.
3. **App Platform or Droplet**
   - `api`: build `pnpm --filter @reservations/api build`, start `node apps/api/dist/index.js`
   - `web` / `dashboard`: Next.js build + start on 3000/3001
4. **Spaces** — create a bucket for restaurant/menu photos; set CDN URL.
5. Point Stripe webhooks to `https://api.yourdomain.com/webhooks/stripe`.
6. **Widget** — `pnpm --filter @reservations/web build` builds and copies `widget.js` to the web app (`/widget.js`). Partners copy embed code from **Booking widget** in the dashboard. The widget defaults to `https://api.tablevera.online/graphql` (override with `data-api-url`).

## Project scripts

```bash
pnpm dev          # turbo: web apps (excludes Expo)
pnpm dev:mobile   # Expo diner app
pnpm build        # turbo build
pnpm db:up        # docker compose up (Mongo single-node replica set for transactions)
pnpm db:down      # docker compose down
pnpm db:reset     # wipe volumes, recreate Mongo RS, re-seed
pnpm seed         # seed restaurants, tables, shifts, users (keeps admins)
pnpm seed -- --clear  # delete seed data only; admin/super_admin accounts untouched
```

**Roles:** `super_admin` can permanently delete users/restaurants and wipe seed data. Regular `admin` and `account_manager` have read/write access to most platform ops but cannot modify super admins or perform destructive deletes. Managers can operate a venue but cannot add restaurants or manage billing.
