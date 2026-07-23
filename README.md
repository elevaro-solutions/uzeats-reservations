# Tablevera

OpenTable-style restaurant reservation platform for the USA market.

Primary domain: [https://tablevera.online](https://tablevera.online)

See [CHANGELOG.md](./CHANGELOG.md) for release history.

## Monorepo

| App / package | Port | Description |
|---|---|---|
| `apps/api` | 4000 | Apollo GraphQL API + BullMQ workers |
| `apps/web` | 3000 | Diner-facing Next.js app |
| `apps/dashboard` | 3001 | Restaurant partner + platform admin |
| `apps/mobile` | Expo | React Native diner app |
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

# 6. Run all apps
pnpm dev
```

- Diner web: http://localhost:3000  
- Partner dashboard: http://localhost:3001  
- GraphQL: http://localhost:4000/graphql  
- Mobile: `pnpm --filter @reservations/mobile dev`

## Demo accounts

Password for all: `Password123!`

| Email | Role |
|---|---|
| `diner@tablevera.local` | Diner (750 loyalty points) |
| `owner@tablevera.local` | Restaurant owner |
| `admin@tablevera.local` | Platform admin |

Phone OTP (dev): any phone + code `123456` when `AUTH_DEV_OTP=true`.

## Features

- Restaurant search (city, cuisine, text, nearby geo) + live availability slots
- Google Places address autocomplete and device near-me (falls back to curated US cities)
- Concurrent-safe booking via atomic table slot claims (no replica set required)
- Deposits via Stripe PaymentIntents (manual capture; stubbed without keys)
- Waitlist + auto-notify on cancellation
- Platform + per-restaurant loyalty (tiers, referrals, expiry) with gift cards and promotion codes
- Reviews after completed visits
- Menus + DO Spaces presigned uploads (stubbed without keys)
- Notifications: email (Resend), Telegram bot, web/Expo push, in-app inbox + channel prefs
- Auth: email/password, Google OAuth, Twilio phone OTP
- Partner Settings hub, notifications prefs, multi-restaurant selector, self-registration, and onboarding checklist
- Shareable booking links (`/r/:slug`) and **Booking widget** page for embed script copy
- Owner phone / walk-in bookings, reservation edit, and reservation-scoped messaging
- Platform admin: users, restaurants, invoices, revenue, support, moderation, templates, config, and annual billing discounts
- Embeddable booking widget with per-restaurant theme

## Design system

Visual language lives in [`packages/ui`](./packages/ui): shared Tablevera brand components, swappable palettes (Forest & Gold or Terracotta & Amber), Plus Jakarta Sans, and Ant Design theme. Set `NEXT_PUBLIC_COLOR_PALETTE` (`1` or `2`). See [`packages/ui/DESIGN.md`](./packages/ui/DESIGN.md).

## Environment

See [`.env.example`](.env.example). Required for local:

```
MONGODB_URI=mongodb://localhost:27017/reservations
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
```

Optional integrations: `STRIPE_*`, `TWILIO_*`, `GOOGLE_CLIENT_ID` + `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Gmail login; must match), `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN` (+ `API_PUBLIC_URL` / `TELEGRAM_WEBHOOK_SECRET` in production), `DO_SPACES_*`, `VAPID_*`.

## Deploy notes (DigitalOcean)

Full steps: [`docs/deploy.md`](./docs/deploy.md).

1. **Managed MongoDB** — standalone or replica set both work (booking uses unique slot claims).
2. **Managed Redis** — for BullMQ reminder / no-show jobs.
3. **App Platform or Droplet**
   - `api`: build `pnpm --filter @reservations/api build`, start `node apps/api/dist/index.js`
   - `web` / `dashboard`: Next.js build + start on 3000/3001
4. **Spaces** — create a bucket for restaurant/menu photos; set CDN URL.
5. Point Stripe webhooks to `https://api.yourdomain.com/webhooks/stripe`.
6. **Widget** — `pnpm --filter @reservations/web build` builds and copies `widget.js` to the web app (`/widget.js`). Partners copy embed code from **Booking widget** in the dashboard.

## Project scripts

```bash
pnpm dev          # turbo: all apps
pnpm build        # turbo build
pnpm db:up        # docker compose up
pnpm db:down      # docker compose down
pnpm seed         # seed restaurants, tables, shifts, users (keeps admins)
pnpm seed -- --clear  # delete seed data only; admin accounts untouched
```
