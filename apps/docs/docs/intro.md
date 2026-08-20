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
| Restaurant owners & staff | [Staff → Overview](/staff/overview) | Partner dashboard |
| Platform operators | [Admins → Platform overview](/admins/platform-overview) | Partner dashboard (admin) |
| Architects & contributors | [Architecture → Overview](/architecture/overview) | — |
| AI / LLM agents | [LLM → Overview](/llm/overview) | — |

## Monorepo at a glance

| App / package | Port | Description |
|---|---|---|
| `apps/api` | 4000 | Apollo GraphQL API + BullMQ workers |
| `apps/web` | 3000 | Diner-facing Next.js app |
| `apps/dashboard` | 3001 | Restaurant partner + platform admin |
| `apps/mobile` | Expo | React Native diner app |
| `apps/docs` | 3002 | This documentation site |
| `packages/shared` | — | Zod schemas, constants, types |
| `packages/ui` | — | Design tokens and shared components |
| `packages/widget` | — | Embeddable booking widget |

## Demo accounts (local)

Password for all seed accounts: `Password123!`

| Email | Role |
|---|---|
| `diner@tablevera.local` | Diner |
| `owner@tablevera.local` | Restaurant owner |
| `admin@tablevera.local` | Super admin |

Phone OTP in development: any phone number + code `123456` when `AUTH_DEV_OTP=true`.

## Quick links

- Product site: [tablevera.online](https://tablevera.online)
- Root README: [github.com — reservations README](https://github.com)
- Design system: see `packages/ui/DESIGN.md` in the repo
- Deployment guide: [Developers → Deployment](/developers/deployment)
