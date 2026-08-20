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

# 6. Run all apps (turbo)
pnpm dev
```

## Local URLs

| Service | URL |
|---|---|
| Diner web | http://localhost:3000 |
| Partner dashboard | http://localhost:3001 |
| GraphQL API | http://localhost:4000/graphql |
| Docs (this site) | http://localhost:3002 |
| Mobile (Expo) | `pnpm --filter @reservations/mobile dev` |

## Demo logins

Password: `Password123!`

| Email | Role |
|---|---|
| `diner@tablevera.local` | Diner (750 loyalty points) |
| `owner@tablevera.local` | Restaurant owner |
| `admin@tablevera.local` | Super admin |

Set `NEXT_PUBLIC_SHOW_DEV_CREDENTIALS=true` in `apps/dashboard/.env.local` to show login hints on the dashboard `/login` page.

## Common scripts

```bash
pnpm dev          # all apps in parallel (turbo)
pnpm build        # production build all packages
pnpm typecheck    # TypeScript across the monorepo
pnpm test         # run test suites
pnpm seed         # seed restaurants, tables, shifts, users
pnpm seed -- --clear  # remove seed data; admin accounts kept
pnpm db:reset     # wipe DB volumes and re-seed
```

## Next steps

- [Monorepo layout](/developers/monorepo) — where code lives
- [API & GraphQL](/developers/api-and-graphql) — backend surface
- [Environment variables](/developers/environment) — full env reference
- [Deployment](/developers/deployment) — production on DigitalOcean
