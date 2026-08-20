# Monorepo layout

Detailed file-level map for contributors. See also [Developers → Monorepo](/developers/monorepo).

## Dependency graph

```
packages/shared  ←── packages/ui
       ↑                    ↑
       │                    │
  apps/api            apps/web, apps/dashboard, apps/mobile
       ↑
packages/widget ──→ apps/web (built into /widget.js)
```

Build order: `shared` → `ui` → `api` / clients / `widget`.

## API internals

```
apps/api/src/
├── index.ts              # HTTP server, Apollo, workers startup
├── config/               # env.ts, plans.ts
├── graphql/
│   ├── typeDefs.ts       # Schema (single large SDL string)
│   └── resolvers/        # Query/Mutation/Subscription resolvers
├── models/               # Mongoose schemas
├── services/             # Business logic (one file per domain)
├── routes/               # Express routes (webhooks, uploads, partner)
├── middleware/           # Auth, integration keys
├── lib/                  # Utilities (errors, logger, loyalty helpers)
└── __tests__/            # Vitest integration tests
```

## Web app (diner)

```
apps/web/src/
├── app/                  # Next.js App Router pages
├── components/           # UI components
├── lib/                  # Apollo client, hooks, helpers
└── middleware.ts         # Auth redirects, SEO
```

Notable routes: `/`, `/restaurants/[id]`, `/saved`, `/waitlist`, `/billing`, SEO hub pages.

## Dashboard (partner + admin)

```
apps/dashboard/src/
├── app/                  # Route segments mirror sidebar nav
├── components/           # DashShell, modals, form components
└── lib/                  # GraphQL, auth, onboarding, roles
```

`DashShell.tsx` drives navigation based on user role and selected restaurant.

## Shared package

```
packages/shared/src/
├── types.ts              # Core TypeScript types
├── roles.ts              # Role guard helpers
├── envVars.ts            # Env var registry for Developer page
├── constants.ts          # App-wide constants
└── annualBilling.ts      # Billing discount logic
```

Always rebuild after changing shared exports:

```bash
pnpm --filter @reservations/shared build
```

## UI package

```
packages/ui/src/
├── tokens.ts             # Colors, spacing, radii, typography
├── theme.ts              # Ant Design theme config
├── palettes.ts           # Palette 1 vs 2
└── *.tsx                 # Shared components
```

Import as `@reservations/ui` in web and dashboard.

## Widget

```
packages/widget/
├── src/                  # Vanilla JS embed
└── dist/widget.js        # Copied to apps/web/public on build
```

Default API URL: `https://api.tablevera.online/graphql`. Override via `data-api-url` attribute.
