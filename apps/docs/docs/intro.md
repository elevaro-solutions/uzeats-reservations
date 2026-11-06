---
sidebar_position: 1
---

# Welcome to Tablevera Docs

**Tablevera** is an OpenTable-style restaurant reservation platform for the USA market. This site documents how the product works for every audience — engineers, diners, restaurant partners, and platform operators — plus reference material for AI coding agents.

## Who should read what?

| Audience | Start here | App |
|---|---|---|
| Engineers | [Developers → Getting started](/developers/getting-started) | Local monorepo |
| Diners | [Diners → Overview](/diners/overview) | [tablevera.online](https://tablevera.online) |
| Restaurant owners & managers | [Managers → Overview](/managers/overview) | Partner dashboard |
| Platform operators | [Admins → Platform overview](/admins/platform-overview) | Partner dashboard (admin) |
| Architects & contributors | [Architecture → Overview](/architecture/overview) | — |
| AI / LLM agents | [LLM → Overview](/llm/overview) | — |
| QA | [Manual QA](/qa/overview) | Partner Hub `/admin/qa` |

## Access

This site is internal. Every page needs an approved docs email: sign in with a one-time code at `/access/`, or request access there. Platform admins approve requests in Partner Hub → Platform → **Docs access**. Platform admin accounts have access automatically.

Do not paste credentials, API keys, server addresses, or customer data into these pages.

## Monorepo at a glance

| App / package | Port | Description |
|---|---|---|
| `apps/api` | 4000 | Apollo GraphQL API + BullMQ workers |
| `apps/web` | 3000 | Diner-facing Next.js app |
| `apps/dashboard` | 3001 | Partner Hub (restaurant partners + platform admin) |
| `apps/mobile` | Expo | Tablevera diner app (App Store, Google Play) |
| `apps/merchant-mobile` | Expo | Tablevera Partner ops app (App Store, Google Play) |
| `apps/docs` | 3002 | This documentation site |
| `apps/e2e` | — | Playwright browser smoke tests |
| `packages/shared` | — | Zod schemas, constants, types |
| `packages/ui` | — | Design tokens and shared components |
| `packages/widget` | — | Embeddable booking widget |

## Demo accounts (local only)

`pnpm seed` creates a diner, a restaurant owner, and a super admin on your local database. The emails and shared password are in `apps/api/src/seed.ts`. Never run the seed against production.

Phone and email OTP in development: code `123456` when `AUTH_DEV_OTP=true`. The API ignores this flag in production.

## Quick links

- Product site: [tablevera.online](https://tablevera.online)
- Root README: `README.md` in the repo
- Design system: see `packages/ui/DESIGN.md` in the repo
- Deployment guide: [Developers → Deployment](/developers/deployment)
