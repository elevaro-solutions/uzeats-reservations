# Manual QA

How the QA team verifies Tablevera releases before sign-off.

## What to use

| Artifact | Purpose |
|---|---|
| Partner Hub `/admin/qa` | Live checklist, Issues, Versions, and QA guide. Super Admin and QA only. |
| Published docs | [https://docs.tablevera.online/qa/overview](https://docs.tablevera.online/qa/overview) — role/feature checklist and the active release page (docs access required) |
| Cursor canvas **Manual QA sign-off** (`canvases/manual-qa-signoff.canvas.tsx`) | Live checkboxes, progress, and release sign-off (who + date). Stays **Active** until every required release-delta item is checked. |
| [Role & feature checklist](./manual-checklist.md) | Evergreen smoke matrix by role and feature (copy into tickets if needed). |
| [Release folders](./releases/) | One file per version: **only the new/changed items** for that release + sign-off block. Active: [v0.93.0](./releases/v0.93.0.md). |
| [Automation testing](../automation-testing.md) | Unit / API / Playwright — run before or alongside manual QA; does not replace manual sign-off. |

## Process

1. **Open the active release** under `docs/qa/releases/` (highest version that is not yet signed off), or create one from [`releases/_TEMPLATE.md`](./releases/_TEMPLATE.md) using `CHANGELOG.md` `[Unreleased]` / new version section.
2. **Run automation** (`pnpm test`) and note result on the release page.
3. **Execute release-delta items first** (new/changed this version). These gate the release.
4. **Then role / feature smoke** from [`manual-checklist.md`](./manual-checklist.md) for surfaces touched by the delta (or full smoke for major releases).
5. **Sign off** only when:
   - All **Required** release-delta checkboxes are done
   - Open **P0** bugs = 0
   - Signatory name + date recorded
6. Move or leave the signed release file as the audit record. Start a new file for the next version.

## Roles (who tests what)

| Role | Surfaces |
|---|---|
| Diner | `apps/web`, `apps/mobile` |
| Owner | Partner Hub settings, billing, team, grow |
| Manager | Ops (reservations, floor, waitlist, guests, messages, reviews) — no billing |
| Host | FOH only: reservations, waitlist, floor, guests, messages |
| Admin / Super admin | Admin hubs, approvals, platform config, moderation |
| Automation QA | `pnpm test`, optional `pnpm test:e2e:smoke` |

## Severity

| Level | Meaning | Gate |
|---|---|---|
| **Required** | Blocks sign-off for this release | Must pass |
| **Recommended** | Should pass for confidence | Track; may ship with waiver note |
| **Optional** | Edge / experimental | Track |

## Environments

Record on every release file:

- Staging URL(s) or local ports (web `3000`, dashboard `3001`, API `4000`)
- Build / commit SHA
- Seed or staging account set used

Demo seeds (local): see API seed output — e.g. `diner@tablevera.local`, `owner@tablevera.local`, `a@tablevera.local` / `Password123!`.
