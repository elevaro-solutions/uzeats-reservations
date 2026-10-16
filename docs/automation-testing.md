# Automation testing

Release automation follows a three-layer pyramid. Manual QA ([platform canvas](../.cursor) / release checklist) still covers exploratory and device-only paths.

```text
        /\
       /  \      Browser E2E (Playwright) — smoke @ apps/e2e
      /----\
     /      \    API integration (Vitest + MongoMemory) — apps/api/src/__tests__
    /--------\
   /          \  Unit (Vitest) — packages/shared pure domain
  /------------\
```

## Commands

| Layer | Command | CI |
|---|---|---|
| All unit + API | `pnpm test` | Yes (`.github/workflows/ci.yml`) |
| Shared unit only | `pnpm test:unit` | via `pnpm test` |
| API integration | `pnpm test:integration` | via `pnpm test` |
| Browser E2E smoke | `pnpm test:e2e:smoke` | Opt-in (`E2E_ENABLED=1` + running apps) |

## Unit — `@reservations/shared`

Fast, no I/O. Covers role gates, party-size bounds, holidays, no-show mode resolution, waitlist transitions, booking URLs/UTMs, annual billing math.

```bash
pnpm --filter @reservations/shared test
```

Add a `*.test.ts` under `packages/shared/src/__tests__/` whenever you introduce pure helpers in shared.

## Integration — `@reservations/api`

GraphQL + services against in-memory MongoDB (`mongodb-memory-server`). These are the primary “business E2E” tests (book, auth, waitlist, deposits, billing policy, reviews, etc.).

```bash
pnpm --filter @reservations/api test
```

Helpers: `apps/api/src/__tests__/helpers.ts` (`createTestApp`, `graphqlRequest`, `registerUser`).

## End-to-end — `@reservations/e2e`

Playwright against diner web (`:3000`) and Partner Hub / Admin (`:3001`). See [`apps/e2e/README.md`](../apps/e2e/README.md).

Critical smoke tags (`@smoke`):

- Diner: home, login, auth, optional book via `E2E_RESTAURANT_SLUG`
- Partner: login, reservations, waitlist
- Admin: `/admin`, `/admin/developer`

## What stays manual

Manual QA process, role/feature checklists, release-delta files, and sign-off: **`docs/qa/`** (start at [`docs/qa/README.md`](./qa/README.md)). Interactive sign-off canvas: `manual-qa-signoff.canvas.tsx`.

- Diner / merchant Expo (simulators, push, offline) — see `docs/qa-mobile-beta-readiness.md`
- Real Stripe / Twilio / SendGrid staging webhooks
- Physical devices, a11y deep passes, exploratory UX

## Adding coverage

1. **Pure logic** → shared unit test  
2. **API contract / state machine** → API Vitest GraphQL test  
3. **Cross-app UI smoke** → Playwright `@smoke` in `apps/e2e/tests/`  
4. Update the platform QA canvas automation section when adding a new release-critical flow
