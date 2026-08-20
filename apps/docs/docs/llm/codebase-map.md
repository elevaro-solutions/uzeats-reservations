# Codebase map

Quick file lookup for AI agents. Paths relative to repo root.

## Apps

| Path | Purpose | Key entry files |
|---|---|---|
| `apps/api/` | GraphQL API + workers | `src/index.ts`, `src/graphql/typeDefs.ts` |
| `apps/web/` | Diner Next.js app | `src/app/`, `src/lib/graphql.ts` |
| `apps/dashboard/` | Partner/admin Next.js | `src/components/DashShell.tsx`, `src/lib/auth.ts` |
| `apps/mobile/` | Expo diner app | `app/(tabs)/`, `src/lib/graphql.ts` |
| `apps/docs/` | Docusaurus docs | `docs/`, `docusaurus.config.ts` |

## API — find code by domain

| Domain | Models | Services | Tests |
|---|---|---|---|
| Auth | `models/User.ts` | `services/auth.ts` | — |
| Restaurants | `models/Restaurant.ts` | `services/restaurants.ts`, `discoverySearch.ts` | — |
| Reservations | `models/Reservation.ts` | `services/reservations.ts`, `availability.ts`, `smartAssign.ts` | — |
| Waitlist | — | waitlist services | — |
| Loyalty | — | `services/restaurantLoyalty.ts`, `lib/loyaltyBuckets.ts` | `__tests__/loyalty.test.ts` |
| Billing | — | `services/planChangePolicy.ts`, `config/plans.ts` | `__tests__/planChangePolicy.test.ts` |
| Gift cards / promos | — | `services/giftCards.ts`, `promotionStats.ts` | `__tests__/giftCards.test.ts`, `promotionCodes.test.ts` |
| Notifications | — | campaigns, push, email helpers | — |
| Admin | `models/SupportTicket.ts` | `services/adminSupport.ts`, `audit.ts` | — |
| Uploads | — | `routes/uploads.ts` | — |
| Import | — | `services/mhtmlImport.ts`, `routes/importRestaurant.ts` | — |
| Platform config | — | `services/platformConfig.ts`, `developerInfo.ts` | — |

## GraphQL

- **Schema:** `apps/api/src/graphql/typeDefs.ts` (large single SDL string)
- **Resolvers:** `apps/api/src/graphql/resolvers/` (split by domain)
- **Client queries:** 
  - Web: `apps/web/src/lib/graphql.ts`
  - Dashboard: `apps/dashboard/src/lib/graphql.ts`

## Dashboard routes (App Router)

Mirror sidebar in `DashShell.tsx`:

| Path prefix | Feature |
|---|---|
| `/reservations` | Booking management |
| `/floor-plan` | Table layout |
| `/settings`, `/edit`, `/menu` | Restaurant config |
| `/campaigns` | Marketing |
| `/admin/*` | Platform admin pages |
| `/admin/developer` | Env var health |

## Web routes

| Path | Feature |
|---|---|
| `/` | Discovery home |
| `/restaurants/[id]` | Detail + booking |
| `/saved`, `/waitlist`, `/billing` | Account features |
| `/for-restaurants`, `/pricing` | Marketing |

## Shared package exports

`packages/shared/src/`:

| File | Export examples |
|---|---|
| `types.ts` | `UserRole`, `User`, restaurant types |
| `roles.ts` | `isPlatformAdmin`, `canManageBilling`, `canEditUser` |
| `envVars.ts` | `ENV_VAR_DEFINITIONS`, `getMissingRequiredEnvVars` |
| `constants.ts` | App-wide constants |

## UI package

`packages/ui/src/` — import `@reservations/ui`:

- `tokens.ts`, `theme.ts`, `palettes.ts`
- Components: `TableveraWordmark`, `StatCard`, `PageHeader`, `StatusTag`

## Config & infra

| File | Purpose |
|---|---|
| `.env.example` | All env vars documented |
| `docker-compose.yml` | Mongo + Redis local |
| `turbo.json` | Task pipeline |
| `.github/workflows/deploy.yml` | CI/CD |
| `dokku/DEPLOY.md` | Dokku deploy |

## Grep patterns for agents

```bash
# Find GraphQL operation usage
rg "gql`|useQuery|useMutation" apps/web apps/dashboard

# Find role checks
rg "isPlatformAdmin|canManageBilling|restaurant_owner" apps/

# Find env var usage
rg "ENV_VAR_DEFINITIONS|process.env" packages/shared apps/api

# Find model fields
rg "new Schema|Schema\\(" apps/api/src/models
```
