# Browser E2E (`@reservations/e2e`)

Playwright smoke suite for **diner web** and **Partner Hub / Admin**.

## Prerequisites

1. API + web + dashboard running (or point at staging).
2. Seeded demo accounts (`pnpm seed`), or override credentials via env.
3. Browsers installed once: `pnpm --filter @reservations/e2e exec playwright install chromium`

## Run

```bash
# Local (defaults: web :3000, dashboard :3001)
pnpm --filter @reservations/e2e test:e2e:smoke

# Staging
E2E_ENABLED=1 \
E2E_WEB_URL=https://tablevera.online \
E2E_DASHBOARD_URL=https://partner.tablevera.online \
E2E_RESTAURANT_SLUG=your-slug \
pnpm --filter @reservations/e2e test:e2e:smoke
```

## Env

| Variable | Default |
|---|---|
| `E2E_WEB_URL` | `http://localhost:3000` |
| `E2E_DASHBOARD_URL` | `http://localhost:3001` |
| `E2E_DINER_EMAIL` / `E2E_DINER_PASSWORD` | `diner@tablevera.local` / `Password123!` |
| `E2E_OWNER_EMAIL` / `E2E_OWNER_PASSWORD` | `owner@tablevera.local` / `Password123!` |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | `a@tablevera.local` / `Password123!` |
| `E2E_RESTAURANT_SLUG` | (empty → book smoke skipped) |
| `E2E_ENABLED` | unset; CI requires `E2E_ENABLED=1` |

## Scope

These are **release smoke** browser tests. Deep GraphQL flows live in `apps/api/src/__tests__` (Vitest + MongoMemoryServer). Pure domain rules live in `packages/shared` unit tests.
