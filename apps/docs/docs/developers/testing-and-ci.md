# Testing & CI

## Running tests

```bash
# All packages (turbo)
pnpm test

# API only
pnpm --filter @reservations/api test
```

API tests live in `apps/api/src/__tests/` and use Vitest. Coverage includes:

- Loyalty accrual and tier upgrades
- Gift cards and promotion codes
- Plan change policy (prorated upgrades, scheduled downgrades)
- Telegram webhook handling

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
3. Relevant API tests pass
4. Manual smoke test on affected surfaces:
   - Diner web (3000) for booking/search changes
   - Dashboard (3001) for partner/admin changes
   - GraphQL playground (4000) for schema/resolver changes

## CI / deploy

GitHub Actions workflow: `.github/workflows/deploy.yml`

Production deploy notes: [Deployment](/developers/deployment) and `docs/deploy.md` in the repo root.

## Seed data for manual testing

```bash
pnpm seed
```

Clears and re-seeds restaurants, tables, shifts, and demo users. Use `pnpm seed -- --clear` to remove seed data while keeping admin accounts.

Demo diner `diner@tablevera.local` starts with 750 loyalty points for testing redemption flows.
