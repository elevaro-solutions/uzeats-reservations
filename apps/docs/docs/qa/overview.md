---
sidebar_position: 1
title: Manual QA
description: How QA verifies a Tablevera release before sign-off.
---

# Manual QA

The live saved checklist is in Partner Hub at `/admin/qa` (dashboard). Only a **super admin** or a user with the **QA** role can open it. Checks, environment notes, and sign-off (name, role, date) are stored in the database. The release stays active until every required item is checked, P0 is confirmed clear, and someone signs off.

This section is the written list. Checkbox ticks on these docs pages are not saved.

## Pages

| Page | Use |
|---|---|
| [Role & feature checklist](/qa/role-and-feature) | Evergreen smoke by role and feature |
| [Release v0.81.0](/qa/release-0-81-0) | **Active** release delta. Stays the gate until every Required item is verified and someone signs off |

## Process

1. Open the **active release** page (highest version that is not signed off).
2. Run automation (`pnpm test`) and note the result on that page.
3. Execute **release-delta** items first. These gate the release.
4. Then run [role & feature smoke](/qa/role-and-feature) for surfaces the release touched (or a full smoke for a major release).
5. **Sign off** only when:
   - Every **Required** release-delta item passed
   - Open **P0** bugs = 0
   - Signatory name and date are filled in

The release stays **Active** until those conditions are met. After sign-off, leave the page as the audit record and add a new release page for the next version (copy the structure from the repo template `docs/qa/releases/_TEMPLATE.md`).

## Roles

| Role | Surfaces |
|---|---|
| Diner | Diner web and diner mobile |
| Owner | Partner Hub settings, billing, team, grow |
| Manager | Reservations, floor, waitlist, guests, messages, reviews — no billing |
| Host | Front of house only: reservations, waitlist, floor, guests, messages |
| Admin / Super admin | Approvals, platform config, moderation |
| Automation | `pnpm test`, optional browser smoke `pnpm test:e2e:smoke` |

## Severity

| Level | Meaning | Gate |
|---|---|---|
| **Required** | Blocks sign-off for this release | Must pass |
| **Recommended** | Should pass for confidence | May ship with a waiver note |
| **Optional** | Edge or experimental | Track |

## Environments

On every release page, record:

- Staging or local URLs (web `3000`, dashboard `3001`, API `4000`)
- Build or commit SHA
- Accounts used

Local demo seeds (after `pnpm seed`): `diner@tablevera.local`, `owner@tablevera.local`, `a@tablevera.local`, password `Password123!`.
