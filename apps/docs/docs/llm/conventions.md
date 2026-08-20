# Conventions

Coding standards inferred from the existing Tablevera codebase. **Match these patterns** when adding or modifying code.

## TypeScript

- Strict TypeScript in all packages
- Prefer explicit types on public APIs; infer locally where obvious
- Use `.js` extensions in API imports (Node ESM): `import { x } from './foo.js'`
- Shared types live in `@reservations/shared` — don't duplicate between apps

## API layer

```
Resolver → Service → Model → MongoDB
                ↘ External APIs (Stripe, Twilio, …)
```

- **Resolvers** — parse args, call service, map errors to GraphQL errors
- **Services** — one file per domain in `apps/api/src/services/`
- **Models** — Mongoose schemas in `apps/api/src/models/`
- **Errors** — use `apps/api/src/lib/errors.ts` helpers for consistent codes

## GraphQL

- Add types to `typeDefs.ts` first, then resolver, then client query in web/dashboard
- Run `pnpm codegen` after schema changes affecting client types
- Name mutations verb-first: `createReservation`, `updateRestaurant`, `cancelReservation`

## Authorization

Always use shared role helpers:

```typescript
import { isPlatformAdmin, canManageBilling } from '@reservations/shared';
```

Never hardcode role string comparisons scattered across files — centralize in shared if a new guard is needed.

## Frontend (web + dashboard)

- **Next.js App Router** — `'use client'` only when needed
- **Ant Design 6** — use `@reservations/ui` tokens for colors/spacing
- **Apollo Client 4** — hooks from `@/lib/apollo-hooks` in dashboard
- **Imports** — `@/` alias maps to `src/` in each app

## Styling

- Import design tokens from `@reservations/ui` (`colors`, `spacing`, `radii`, `typography`)
- Don't hardcode brand hex values — use token names
- Palette switch via `NEXT_PUBLIC_COLOR_PALETTE` (1 or 2)

## Naming

| Entity | Convention |
|---|---|
| React components | PascalCase files and exports |
| Services | camelCase files, exported functions |
| GraphQL types | PascalCase |
| Env vars | SCREAMING_SNAKE_CASE |
| Mongo collections | lowercase plural (Mongoose default) |

## Comments

- Code should be self-explanatory
- Comment only non-obvious business rules (e.g. loyalty expiry, plan change proration)
- Don't add narrating comments ("// import react")

## Tests

- API tests in `apps/api/src/__tests__/` using Vitest
- Test real business logic, not trivial getters
- Only add tests when requested or when covering non-obvious behavior

## Git

- Don't commit unless user explicitly asks
- Don't commit `.env` files or secrets
- Follow existing CHANGELOG format for release notes (if asked)

## Monorepo

- Use `pnpm --filter @reservations/<pkg>` for scoped commands
- Workspace deps: `"@reservations/shared": "workspace:*"`
- Turbo handles build order via `dependsOn: ["^build"]`

## Feature flags / stubs

External integrations stub gracefully when env vars missing. Follow existing stub patterns in services rather than throwing in development.

Example: Stripe payments return mock IDs; Spaces uploads return placeholder URLs.
