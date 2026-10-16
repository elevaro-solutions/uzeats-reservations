---
sidebar_position: 3
title: Release v0.81.0
slug: release-0-81-0
description: Active manual QA gate for Tablevera 0.81.0.
---

# Release v0.81.0

**Status:** Active  
**Source:** changelog `0.81.0` (2026-10-14)  
**Env:** _______________ **Commit / build:** _______________

The status stays **Active** until every **Required** item below has been verified and the sign-off block is filled in. Then set the status to **Signed off**.

Process: [Manual QA](/qa/overview). Broader smoke: [Role and feature checklist](/qa/role-and-feature).

## Automation (before manual)

- [ ] `pnpm test` is green (unit and API)
- [ ] Optional: `pnpm test:e2e:smoke` against this environment

## Release delta — Required

### Partner Hub and Admin

- [ ] **Pin to sidebar:** pin a Settings, Grow, or Insights card (and an admin Billing or Platform card). It appears under that section and stays after refresh
- [ ] **No-show mode** defaults to manual only: staff mark the no-show and a configured card-guarantee fee charges. Auto mode marks at the end of the slot and does not charge
- [ ] **Follow-up emails** send for no-show and completed visits (`booking_no_show`, `booking_completed`) when email is configured
- [ ] **Admin Engagement email** (`/admin/engagement`) can send a one-off diner message
- [ ] **Holiday catalog:** major holidays stay open until an owner or manager approves closing; a restaurant can opt out or switch to auto-close
- [ ] Holiday pickers show **Name (key)**, for example Christmas Day (christmas_day)
- [ ] Closures and hours: require staff approval before closing; the holiday dropdown fills the date; a date override can close a day or set custom hours; pending holiday approvals are listed
- [ ] Setup guide includes no-show defaults, holidays, follow-up templates, and engagement email
- [ ] **Min and max party size (online)** on the restaurant profile. The diner Guests picker follows those bounds. Above the max, a Large party action appears. The API rejects an out-of-range party
- [ ] Discovery Guests picker allows parties up to 50
- [ ] **Multi-cuisine** (up to 8) saves on the profile and shows on the public listing
- [ ] Booking policies are grouped, with tooltips and named holiday pickers
- [ ] A new restaurant’s default URL slug is location-based (`name-city-state`)

### Floor and Virtual 3D

- [ ] Floor plan: walls and fixtures rotate; area underlay has fit, scale, and rotation
- [ ] Virtual 3D: wall Stretch versus Tile, wall and floor rotation, optional room width and depth
- [ ] Virtual 3D floors and walls follow the drawn room outline

### Signup and discovery fixes

- [ ] Partner signup Business step does not offer DoorDash or Uber Eats import (import only after login)
- [ ] Home and discovery cards do not stack star ratings into a tall column while styles load
- [ ] First-time listing setup shows the import coachmark, and it dismisses after import or once description and photos exist

## Release delta — Recommended

- [ ] Merchant Floor Plan view still seats from the room canvas
- [ ] Widget Guests picker uses the same min, max, and Large party action
- [ ] A host can mark a no-show and cannot open billing

## Role smoke for this release

- [ ] Diner web — party size, discovery ratings, out-of-range booking rejected
- [ ] Partner Hub owner — profile, closures, policies, pins, setup guide
- [ ] Partner Hub host — no-show mark
- [ ] Admin — engagement email and holiday or platform config
- [ ] Embed widget — party size (recommended)

## Defects

| ID | Severity | Summary | Status |
|---|---|---|---|
| | | | |

Open P0 count must be 0 to sign off.

## Sign-off

| Field | Value |
|---|---|
| Status | **Active** (change to Signed off when done) |
| Signed off by | |
| Role / team | |
| Date (YYYY-MM-DD) | |
| Timezone | |
| Confirms | All Required items tested; open P0 = 0 |
| Notes / waivers | |

Fill this table in the doc change (or the QA ticket) when the release is verified. The published page does not store checkbox state.
