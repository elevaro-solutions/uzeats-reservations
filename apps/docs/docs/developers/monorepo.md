# Monorepo layout

Tablevera is a **pnpm workspace** managed with **Turborepo**. Packages depend on each other via `workspace:*` protocol.

## Workspace structure

```
reservations/
├── apps/
│   ├── api/          # GraphQL API, workers, webhooks
│   ├── web/          # Diner Next.js app
│   ├── dashboard/    # Partner + admin Next.js app
│   ├── mobile/       # Expo React Native app
│   └── docs/         # Docusaurus documentation (this site)
├── packages/
│   ├── shared/       # Types, Zod schemas, env var registry, constants
│   ├── ui/           # Design tokens, Ant Design theme, shared components
│   ├── widget/       # Embeddable booking widget (built into web)
│   └── config/       # Shared TS/ESLint config
├── docs/             # Legacy markdown (deploy notes, etc.)
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

## Apps

### `apps/api`

- **Stack:** Node.js, Apollo Server, Mongoose, BullMQ, Stripe, Twilio
- **Entry:** `src/index.ts` → compiled to `dist/index.js`
- **GraphQL schema:** `src/graphql/typeDefs.ts` + resolvers in `src/graphql/resolvers/`
- **Services:** business logic in `src/services/`
- **Models:** Mongoose schemas in `src/models/`
- **Routes:** REST endpoints (webhooks, uploads, partner registration) in `src/routes/`
- **Workers:** BullMQ job processors for reminders and no-show checks

### `apps/web`

- **Stack:** Next.js App Router, Apollo Client, Ant Design
- **Audience:** Diners — search, restaurant pages, booking, account
- **Widget:** `pnpm build` also compiles `packages/widget` → `/widget.js`

### `apps/dashboard`

- **Stack:** Next.js App Router, Apollo Client, Ant Design
- **Audience:** Restaurant owners, staff, platform admins
- **Multi-restaurant:** owners with several venues use a restaurant selector in the shell

### `apps/mobile`

- **Stack:** Expo, React Native, Apollo Client
- **Audience:** Diners on iOS/Android

## Packages

### `packages/shared`

Build this package before running API or clients:

```bash
pnpm --filter @reservations/shared build
```

Exports include:

- TypeScript types and Zod schemas
- Role helpers (`isPlatformAdmin`, `canManageBilling`, …)
- Environment variable definitions used by the admin Developer page
- Shared constants (plans, loyalty tiers, etc.)

### `packages/ui`

Shared Tablevera design system — tokens, Ant Design theme, and reusable components (`TableveraWordmark`, `StatCard`, etc.). See `packages/ui/DESIGN.md`.

### `packages/widget`

Standalone embeddable booking widget. Built as part of the web app deploy and served at `/widget.js`.

## Turborepo tasks

Defined in `turbo.json`:

| Task | Notes |
|---|---|
| `build` | Depends on `^build` (upstream packages first) |
| `dev` | Persistent, no cache |
| `lint` / `typecheck` | Depends on `^build` |
| `test` | Depends on `^build` |

Run a single app:

```bash
pnpm --filter @reservations/api dev
pnpm --filter @reservations/docs dev
```

## Codegen

GraphQL types are generated for shared clients:

```bash
pnpm codegen
```

This runs codegen in `@reservations/api` and `@reservations/shared`.
