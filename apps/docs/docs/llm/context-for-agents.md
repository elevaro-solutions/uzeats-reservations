# Context for agents

Copy-paste block for LLM system prompts or `.cursor/rules` when working in this repository.

---

## Tablevera — agent context

**Product:** OpenTable-style restaurant reservations (USA). Monorepo: pnpm + Turborepo.

**Apps:**
- `apps/api` (4000) — Apollo GraphQL, Mongoose, BullMQ, Stripe/Twilio/Spaces
- `apps/web` (3000) — Diner Next.js 16 + React 19 + Ant Design 6
- `apps/dashboard` (3001) — Partner/admin Next.js
- `apps/mobile` — Expo diner app
- `apps/docs` (3002) — Docusaurus documentation

**Packages:**
- `@reservations/shared` — types, Zod, roles, env registry (**build after edits**)
- `@reservations/ui` — design tokens + shared components
- `@reservations/widget` — embeddable booking script → `/widget.js`

**Roles:** `diner` | `restaurant_owner` | `staff` | `admin` | `super_admin`  
**Guards:** import from `@reservations/shared` — `isPlatformAdmin`, `canManageBilling`, `canEditUser`

**Architecture:** Resolvers → Services → Models. GraphQL schema in `apps/api/src/graphql/typeDefs.ts`. Business logic never in resolvers.

**Auth:** HttpOnly JWT cookies (web/dashboard). Google OAuth + Twilio OTP. Dev OTP: `123456`.

**Booking:** Atomic slot claims via unique Mongo index. Availability in `services/availability.ts`.

**Local setup:**
```bash
pnpm install && cp .env.example .env && pnpm db:up
pnpm --filter @reservations/shared build && pnpm seed && pnpm dev
```

**Demo logins:** `*@tablevera.local` / `Password123!`

**Rules:**
- Smallest correct diff; no drive-by refactors
- No commits or secrets unless user asks
- Match existing naming, imports, and Ant Design + token usage
- Stub external services when env vars missing (see existing services)
- Docs: `apps/docs/` | Deploy: `docs/deploy.md` | Design: `packages/ui/DESIGN.md`

**Docs site sections:** Developers | Diners | Staff | Admins | Architecture | LLM

---

## Suggested `.cursor/rules` snippet

If maintaining Cursor rules in-repo, link to this docs site:

```markdown
# Tablevera

Read https://docs.tablevera.online/llm/overview (or local http://localhost:3002/llm/overview) for monorepo context.

- GraphQL API in apps/api; shared types in packages/shared
- Rebuild shared after type changes: pnpm --filter @reservations/shared build
- Use role helpers from @reservations/shared
- Do not commit unless explicitly requested
```

## MCP / tool usage hints

When using codebase search:

1. Start with domain keyword + `apps/api/src/services/`
2. For UI, check both web and dashboard — patterns differ (DashShell vs AppShell)
3. For env issues, read `packages/shared/src/envVars.ts` not just `.env.example`

When using browser tools:

- Diner flows: http://localhost:3000
- Partner flows: http://localhost:3001 (login as owner@tablevera.local)
- Admin flows: http://localhost:3001/admin/* (login as admin@tablevera.local)

## Version

Check root `package.json` `version` and `CHANGELOG.md` for current release. Developer page shows runtime version to admins.
