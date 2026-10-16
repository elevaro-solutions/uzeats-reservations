# Testing & CI

Full pyramid notes live in the monorepo at `docs/automation-testing.md`.

## Running tests

```bash
# Unit (shared) + API integration (turbo)
pnpm test

# Layers
pnpm test:unit
pnpm test:integration

# Browser E2E smoke (apps must be running; see apps/e2e/README.md)
pnpm test:e2e:smoke
```

### Unit — `@reservations/shared`

Vitest tests under `packages/shared/src/__tests__/` for pure domain helpers (roles, party size, holidays, waitlist, booking URLs, billing math).

### Integration — `@reservations/api`

API tests live in `apps/api/src/__tests__/` and use Vitest + MongoMemoryServer. Coverage includes:

- Booking, availability, deposits, confirmation numbers
- Auth, loyalty, gift cards, promotion codes
- Plan change policy (prorated upgrades, scheduled downgrades)
- Waitlist ops, party-size bounds, holidays / location slugs
- Owner/manager support tickets (`createOwnerSupportTicket` / `myOwnerSupportTickets`), including HTML details and image attachments
- Telegram webhook handling

### Browser E2E — `@reservations/e2e`

Playwright smokes for diner web + Partner Hub / Admin. Not part of default `pnpm test` (requires live servers). Opt into CI with repo variable `E2E_ENABLED=1`.

## Type checking

```bash
pnpm typecheck
```

Each app/package has its own `tsconfig.json`. Shared types flow from `@reservations/shared`.

## Linting

```bash
pnpm lint
```

## Local QA checklist

Before opening a PR, verify:

1. `pnpm --filter @reservations/shared build` succeeds
2. `pnpm typecheck` passes
3. Relevant unit + API tests pass (`pnpm test`)
4. Manual smoke test on affected surfaces:
   - Diner web (3000) for booking/search changes
   - Dashboard (3001) for partner/admin changes
   - GraphQL playground (4000) for schema/resolver changes
5. Optional: `pnpm test:e2e:smoke` when UI flows changed and apps are running

## CI / deploy

GitHub Actions workflow: `.github/workflows/ci.yml`

- Always: typecheck, unit + API tests, Docker builds
- Optional: Playwright smoke when `vars.E2E_ENABLED == '1'`

Production deploy notes: [Deployment](/developers/deployment) and `docs/deploy.md` in the repo root.

## Seed data for manual testing

```bash
pnpm seed
```

Clears and re-seeds restaurants, tables, shifts, and demo users. Use `pnpm seed -- --clear` to remove seed data while keeping admin accounts.

Demo diner `diner@tablevera.local` starts with 750 loyalty points for testing redemption flows.
