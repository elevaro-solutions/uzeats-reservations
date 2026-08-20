# Common tasks

Step-by-step recipes for frequent development tasks.

## Add a GraphQL field

1. Add type/field to `apps/api/src/graphql/typeDefs.ts`
2. Implement resolver in `apps/api/src/graphql/resolvers/`
3. Add service method if logic is non-trivial
4. Add client query/mutation to `apps/web/src/lib/graphql.ts` and/or `apps/dashboard/src/lib/graphql.ts`
5. Run `pnpm codegen` if generating typed hooks
6. Run `pnpm typecheck`

## Add a new API service

1. Create `apps/api/src/services/myFeature.ts`
2. Export functions called by resolvers
3. Import models from `apps/api/src/models/`
4. Use role guards from `@reservations/shared`
5. Add tests in `apps/api/src/__tests__/myFeature.test.ts` if logic is complex

## Add a dashboard page

1. Create route under `apps/dashboard/src/app/my-page/page.tsx`
2. Add nav item in `apps/dashboard/src/components/DashShell.tsx`
3. Use Ant Design components + `@reservations/ui` tokens
4. Fetch data with Apollo `useQuery` / `useMutation`
5. Gate visibility by role if admin-only

## Add a diner web page

1. Create route under `apps/web/src/app/my-page/page.tsx`
2. Add SEO metadata via layout or `generateMetadata`
3. Use existing components from `apps/web/src/components/`
4. Consider mobile responsiveness (most diners on phone)

## Change shared types

1. Edit `packages/shared/src/types.ts` (or relevant file)
2. Export from `packages/shared/src/index.ts` if new file
3. Rebuild: `pnpm --filter @reservations/shared build`
4. Fix type errors in dependent apps
5. Run `pnpm typecheck`

## Add an environment variable

1. Add definition to `packages/shared/src/envVars.ts` with `apps` scope
2. Read in `apps/api/src/config/env.ts` (or client `process.env.NEXT_PUBLIC_*`)
3. Document in [Environment variables](/developers/environment)
4. Rebuild shared package
5. Verify on `/admin/developer` page in dashboard

## Run locally from scratch

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm --filter @reservations/shared build
pnpm seed
pnpm dev
```

## Reset local database

```bash
pnpm db:reset
```

## Test a GraphQL mutation manually

1. Start API: `pnpm --filter @reservations/api dev`
2. Open http://localhost:4000/graphql
3. Login via mutation, then run operation with cookies

Or use dashboard/web UI and inspect network tab.

## Build widget after changes

```bash
pnpm --filter @reservations/widget build
```

Web app prebuild hook runs this automatically on `pnpm --filter @reservations/web build`.

## Update documentation

Human docs: edit markdown in `apps/docs/docs/`  
Then verify: `pnpm --filter @reservations/docs dev` → http://localhost:3002

## Deploy checklist (agent summary)

1. `pnpm build` succeeds
2. `pnpm typecheck` passes
3. API tests pass
4. Env vars documented and set in production
5. Stripe webhook URL updated if payment changes
6. `CHANGELOG.md` updated if releasing (when user asks)

## Import restaurant from MHTML

Dashboard admin flow + API:

- UI: `apps/dashboard/src/components/ImportRestaurantModal.tsx`
- API route: `apps/api/src/routes/importRestaurant.ts`
- Parser: `apps/api/src/services/mhtmlImport.ts`

## Debug missing env vars

1. Login as `admin@tablevera.local`
2. Navigate to `/admin/developer`
3. Compare required vs configured per app
4. Cross-reference `packages/shared/src/envVars.ts`
