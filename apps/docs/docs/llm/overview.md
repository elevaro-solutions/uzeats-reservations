# LLM overview

This section provides **structured context for AI coding agents** (Cursor, Copilot, Claude, etc.) working in the Tablevera monorepo.

## Project identity

| Property | Value |
|---|---|
| Product name | **Tablevera** |
| Domain | https://tablevera.online |
| Type | Restaurant reservation platform (OpenTable-style, USA market) |
| Repo layout | pnpm monorepo + Turborepo |
| Primary API | GraphQL (Apollo Server) on port 4000 |
| Database | MongoDB (Mongoose) |
| Queue | Redis + BullMQ |

## Before making changes

1. Read [Codebase map](/llm/codebase-map) to locate relevant files
2. Follow [Conventions](/llm/conventions) — match existing patterns
3. Check [Common tasks](/llm/common-tasks) for recurring workflows
4. Rebuild `@reservations/shared` if you change shared types

## Hard rules for agents

- **Minimize scope** — smallest correct diff; don't refactor unrelated code
- **No secrets in commits** — never commit `.env`, keys, or credentials
- **Match role guards** — use helpers from `@reservations/shared`, don't invent new role strings
- **Service layer** — put business logic in `apps/api/src/services/`, keep resolvers thin
- **Build shared first** — after editing `packages/shared`, run `pnpm --filter @reservations/shared build`
- **Don't commit unless asked** — user must explicitly request git commits

## Audience-specific docs

When the user's task mentions a persona, load the matching guide:

| Persona | Doc section |
|---|---|
| Guest / diner UX | [Diners](/diners/overview) |
| Restaurant partner | [Staff](/staff/overview) |
| Platform operator | [Admins](/admins/platform-overview) |
| Infrastructure / API | [Developers](/developers/getting-started) |
| System design | [Architecture](/architecture/overview) |

## Key commands

```bash
pnpm install
pnpm db:up
pnpm --filter @reservations/shared build
pnpm seed
pnpm dev                              # all apps
pnpm --filter @reservations/api dev   # API only
pnpm --filter @reservations/docs dev  # docs on :3002
pnpm typecheck
pnpm --filter @reservations/api test
```

## Demo credentials

```
diner@tablevera.local / Password123!
owner@tablevera.local / Password123!
admin@tablevera.local / Password123!
OTP dev code: 123456 (AUTH_DEV_OTP=true)
```

## Where human docs live

| Location | Contents |
|---|---|
| `apps/docs/` | This Docusaurus site |
| `README.md` | Quick start, feature list |
| `docs/deploy.md` | Production deploy |
| `packages/ui/DESIGN.md` | Design tokens |
| `CHANGELOG.md` | Release history |

## Suggested agent workflow

1. Identify affected app(s): api, web, dashboard, mobile, shared, ui, widget
2. Grep for existing patterns before adding new abstractions
3. Implement + typecheck affected packages
4. Run targeted tests if touching API business logic
5. Summarize changes with file paths for the user
