---
sidebar_position: 1
title: Manual QA
description: How QA verifies a Tablevera release before sign-off.
---

# Manual QA

The release gate lives in Partner Hub, not on this site. Only a **super admin** or a user with the **QA** role can open it.

| Page | Use |
|---|---|
| `/admin/qa/dashboard` | Run counts, required progress, current-gate progress, recent sign-offs |
| `/admin/qa` | **Active** release checklist. Each item has steps, an optional note, and completion time; sign-off stores name, role, and date |
| `/admin/qa/history` | Every prior run with its tasks, notes, progress, and sign-off. Open one with `/admin/qa?release=…` |
| `/admin/qa/issues` | File bugs and features (severity, status, page, environment, release, screenshots); export as PDF, Excel, or Word |
| `/admin/qa/versions`, `/admin/qa/guide` | Release notes for every version, and how to test and report problems |

Each release's tasks ship with that release. The written copy of every checklist is in the repo under `docs/qa/releases/` (the active one is named in `docs/qa/README.md`). Checkbox ticks on these docs pages are not saved.

## Pages on this site

| Page | Use |
|---|---|
| [Role & feature checklist](/qa/role-and-feature) | Evergreen smoke by role and feature |
| [Release v0.81.0](/qa/release-0-81-0) | Archived example of a release-delta page (superseded by `/admin/qa`) |

## Process

1. Open `/admin/qa` for the **active release** (the latest shipped version that is not signed off).
2. Run automation (`pnpm test`) and note the result on the run.
3. Execute **release-delta** items first. These gate the release.
4. Then run [role & feature smoke](/qa/role-and-feature) for surfaces the release touched (or a full smoke for a major release).
5. **Sign off** only when:
   - Every **Required** item passed
   - Open **P0** bugs = 0
   - Signatory name and date are filled in

Replacing the live checklist with a newer version keeps a snapshot, so unfinished prior-version work stays on History.

## Roles

| Role | Surfaces |
|---|---|
| Diner | Diner web and diner mobile |
| Owner | Partner Hub settings, billing, team, grow, agreements |
| Manager | Reservations, floor, waitlist, guests, messages, reviews — no billing |
| Host | Front of house only: reservations, waitlist, floor, guests, messages |
| Admin / Super admin | Approvals, platform config, moderation, agreements |
| QA | `/admin/qa` checklist, history, and issues |
| Automation | `pnpm test`, optional browser smoke `pnpm test:e2e:smoke` |

## Severity

| Level | Meaning | Gate |
|---|---|---|
| **Required** | Blocks sign-off for this release | Must pass |
| **Recommended** | Should pass for confidence | May ship with a waiver note |
| **Optional** | Edge or experimental | Track |

## Environments

On every run, record:

- Staging or local URLs (web `3000`, dashboard `3001`, API `4000`)
- Build or commit SHA (shown under the Partner Hub sidebar)
- Accounts used (by role, not password)

For local testing, `pnpm seed` creates a diner, owner, and super admin; their credentials are in `apps/api/src/seed.ts`. Never write passwords into QA notes, issues, or this site.
