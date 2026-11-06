# Getting started

This guide gets the Tablevera monorepo running on your machine.

## Prerequisites

- **Node.js 20+**
- **pnpm 9+**
- **Docker** (MongoDB + Redis via `docker compose`)

Client apps use **Next.js 16**, **React 19**, **Ant Design 6**, and **Apollo Client 4**.

## Install and run

```bash
# 1. Install dependencies
pnpm install

# 2. Environment
cp .env.example .env
# Optionally copy into apps/api/.env and apps/web/.env.local

# 3. Start MongoDB + Redis
pnpm db:up

# 4. Build shared package (required before API/clients)
pnpm --filter @reservations/shared build

# 5. Seed demo data
pnpm seed

# 6. Run web apps (API, diner web, dashboard, docs)
pnpm dev
```

## Local URLs

| Service | URL |
|---|---|
| Diner web | http://localhost:3000 |
| Partner dashboard | http://localhost:3001 |
| GraphQL API | http://localhost:4000/graphql |
| Docs (this site) | http://localhost:3002 |
| Mobile (Expo) | `pnpm dev:mobile` |

## Demo logins (local only)

`pnpm seed` creates these accounts. Their emails and shared password are in `apps/api/src/seed.ts`.

| Account | Role |
|---|---|
| Seed diner | Diner (750 loyalty points) |
| Seed owner | Restaurant owner |
| Seed admin | Super admin |

Set `NEXT_PUBLIC_SHOW_DEV_CREDENTIALS=true` in `apps/dashboard/.env.local` to show login hints on the dashboard `/login` page. Never set it in production.

## Common scripts

```bash
pnpm dev          # web apps in parallel (excludes Expo)
pnpm dev:mobile   # Expo diner app
pnpm build        # production build all packages
pnpm typecheck    # TypeScript across the monorepo
pnpm test         # unit + API integration suites
pnpm test:e2e:smoke  # Playwright smoke (apps must be running)
pnpm seed         # seed restaurants, tables, shifts, users
pnpm seed -- --clear  # remove seed data; admin accounts kept
pnpm db:reset     # wipe DB volumes and re-seed
```

## Next steps

- [Monorepo layout](/developers/monorepo) — where code lives
- [API & GraphQL](/developers/api-and-graphql) — backend surface
- [Environment variables](/developers/environment) — full env reference
- [Deployment](/developers/deployment) — production on DigitalOcean
