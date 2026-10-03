# QA test plan — v0.74.0 (2026-10-03)

**Release:** `0.74.0`  
**Scope:** Waitlist ops, setup guides, manual-approval guest UX, Partner Hub overview/lists, web discovery search, forgot-password limits, admin reservations cleanup  
**Apps:** Partner Hub (dashboard), Admin, Diner web, Diner mobile, Merchant mobile, API  
**Also verify from this train:** `0.73.3` / `0.73.4` patches listed at the end  

Use this as a smoke + regression checklist. Mark each case **Pass / Fail / Blocked** and note environment (staging / local), role, and restaurant plan (Basic / Core / Premium).

---

## Roles & accounts to prepare

| Role | Use for |
| --- | --- |
| Diner (web + mobile) | Join waitlist, book with approval, My waitlist, forgot password |
| Owner / Manager | Setup guide, waitlist edit/seat, overview, reservations badge |
| Host | Waitlist overdue alerts, seat, FOH waitlist filters |
| Admin / Super admin | Platform setup, config deep links, admin reservations |
| Support mailbox access | `@tablevera.online` password reset routing |

**Prep data**

- Restaurant with waitlist enabled (plan feature on)
- Restaurant with **manual approval** rules (party-size and/or per-table)
- Restaurant with Premium SMS on (for walk-in notify SMS)
- At least 2 active waitlist parties same date (for expire cascade)
- Multi-location owner account (overview pagination)
- Owner on **Basic** (setup guide “Upgrade plan” for booking rules)
- Second platform admin account (or ability to create one) for invite-team step

---

## 1. Waitlist — convert / expire / seat

### 1.1 Convert to booked when diner books

| # | Steps | Expected |
| --- | --- | --- |
| W1 | Diner joins waitlist for Restaurant A, date D | Entry status `waiting` |
| W2 | Same diner books a reservation for A on date D | Waitlist entry → `booked`, linked to reservation |
| W3 | Partner Hub / merchant mobile waitlist History | Shows booked entry; Live no longer lists it as active |

### 1.2 Notify hold expire + cascade

| # | Steps | Expected |
| --- | --- | --- |
| W4 | Two waiting parties for same restaurant/date; cancel/no-show a matching booking (or trigger notify) so party 1 becomes `notified` | Party 1 gets notify; hold starts |
| W5 | Wait **15+ minutes** without party 1 booking | Party 1 expires; party 2 is notified next |
| W6 | Premium SMS on + walk-in in queue | Walk-in receives SMS on auto-notify |

### 1.3 Seat → walk-in reservation

| # | Steps | Expected |
| --- | --- | --- |
| W7 | Partner/Host: Seat an active entry **without** table | Creates walk-in reservation; status `seated` |
| W8 | Seat with optional `tableId` | Reservation assigned to that table |
| W9 | Invalid status jump (e.g. history → seated) | Rejected / action hidden |

---

## 2. Waitlist — partner & merchant UX

### 2.1 Filters & list layout (Partner Hub `/waitlist`)

| # | Steps | Expected |
| --- | --- | --- |
| WL1 | Toggle Live / History | Correct subsets |
| WL2 | Filter by source + date | List updates; no stale rows |
| WL3 | Columns | Position, Guest, Party, Wait, Status + compact actions menu |
| WL4 | Guest row secondary text | Source / preferred slot under name |
| WL5 | Desktop width | **No horizontal scroll** on the list card |

### 2.2 Merchant mobile waitlist

| # | Steps | Expected |
| --- | --- | --- |
| WL6 | Live / History tabs | Match Partner Hub semantics |
| WL7 | Card shows elapsed wait vs promised wait | Both visible when quote exists |
| WL8 | Edit active entry (name/phone/party/quoted wait/diner link) | Saves; list refreshes |
| WL9 | Add walk-in → search guest by name / email / phone (digits tolerant) | Guest-book visits rank first; can attach `dinerId` |
| WL10 | Add walk-in with phone matching platform diner | Soft-links account when applicable |

### 2.3 Partner Hub edit + guest search

| # | Steps | Expected |
| --- | --- | --- |
| WL11 | Edit waiting/notified entry fields | Persists; cannot attach diner already active same date |
| WL12 | Unlink diner (`dinerId` null) | Link cleared |

### 2.4 Overdue alerts

| # | Steps | Expected |
| --- | --- | --- |
| WL13 | Walk-in with quoted wait; leave waiting past quote | Host/manager gets `waitlist_overdue` alert |
| WL14 | Leave overdue another **15+ minutes** | Re-alert fires |
| WL15 | No quote set | Overdue uses **45 min** default |

### 2.5 Online join + preferred window

| # | Steps | Expected |
| --- | --- | --- |
| WL16 | Diner web: unavailable slot → join waitlist | Preferred time window carried from slot |
| WL17 | Diner mobile: same path | Preferred window saved/shown |
| WL18 | Restaurant waitlist plan feature **off** | Online join blocked / hidden |

---

## 3. Diner mobile — My waitlist

| # | Steps | Expected |
| --- | --- | --- |
| MW1 | Profile → My waitlist (`/waitlist`) | Lists active entries |
| MW2 | Cancel entry | Removed / cancelled; partner Live updates |
| MW3 | Book now from entry | Opens booking for that restaurant/date |
| MW4 | Tap waitlist push / in-app notification | Deep links to waitlist (or correct entry) |

---

## 4. Manual approval — guest messaging (web + diner mobile)

Use a restaurant where approval is required for the party size / table rules.

| # | Steps | Expected |
| --- | --- | --- |
| MA1 | Open booking form before submit | Notice that booking needs restaurant approval |
| MA2 | Table picker when a table needs approval | Table labelled as needing approval |
| MA3 | Auto-assign path where outcome depends on table | Copy says **may need approval** |
| MA4 | Confirm step | Primary CTA is **Send request** (not “Confirm reservation”) |
| MA5 | After submit | Success: **Request sent / Awaiting approval** (not “Reservation confirmed”) |
| MA6 | Reservation detail | Explains pending / awaiting restaurant confirmation |
| MA7 | Booking that does **not** need approval | Normal confirm copy (no false approval messaging) |

---

## 5. Partner Hub — setup guide & onboarding

### 5.1 Floating guide (owner / manager)

| # | Steps | Expected |
| --- | --- | --- |
| SG1 | Fresh / incomplete restaurant setup | Floating guide with grouped sections + progress bar |
| SG2 | Inline task actions | Navigate / complete without losing guide context |
| SG3 | Skip optional steps | Progress updates; required remain |
| SG4 | Minimize | Collapses to launcher pill |
| SG5 | Account menu hide / reopen | Guide hidden; can reopen |
| SG6 | Complete a step in another tab/window, return focus | Step ticks within ~30s poll (or on focus) |
| SG7 | Owner on **Basic** | Booking rules step = **Upgrade plan**; managers don’t see owner-only steps as required incorrectly |
| SG8 | Platform deposits switch **off** | Deposits step hidden |
| SG9 | “Finish setting up” banner | Only after guide is **hidden** and required steps remain |

### 5.2 Full-page `/onboarding`

| # | Steps | Expected |
| --- | --- | --- |
| SG10 | Open `/onboarding` | Same grouped sections as floating guide (listing, service, payments, team, go live) |
| SG11 | Create an access / booking rule | “Configure booking rules” completes (no longer stuck forever) |

### 5.3 Admin setup guide + Platform setup

| # | Steps | Expected |
| --- | --- | --- |
| SG12 | Admin / super_admin floating guide | Platform setup sections appear |
| SG13 | `/admin/setup` | Checklist: support, Stripe, feature switches, pricing, email templates, restaurant approvals, admin team |
| SG14 | Platform hub **Platform setup** card | Live progress; reachable after floating guide dismissed |
| SG15 | “Invite your admin team” | Completes **only** when another platform admin exists (not on click alone) |
| SG16 | “Switch Stripe to production” | Super-admin only for other admins; they can skip |
| SG17 | Approve/reject restaurant while guide open | Platform guide progress refreshes immediately |
| SG18 | Admin config `?section=` deep link | Opens correct config section |

---

## 6. Partner Hub — overview, reservations, tables

### 6.1 Overview (`/overview`)

| # | Steps | Expected |
| --- | --- | --- |
| OV1 | Visit Partner Hub root `/` | Role-based redirect (owners/managers → overview path as designed) |
| OV2 | Summary cards | Link to restaurants, reservations, waitlist, notifications, reviews |
| OV3 | Multi-location restaurant table | Paginated |
| OV4 | Recent alert | Opens right-side detail drawer |

### 6.2 Reservations list & badge

| # | Steps | Expected |
| --- | --- | --- |
| OV5 | `/reservations` columns | When, Guest, Party, Table, Status, Actions (+ Location if all locations) |
| OV6 | Deposit / source / occasion / phone | On detail or create-edit only — not crowding the table |
| OV7 | No horizontal scroll; list fills card | Pass on desktop widths |
| OV8 | Sidebar Reservations badge | Counts upcoming reservations **awaiting confirmation**; updates when approved/rejected |

### 6.3 Add / Edit table modal

| # | Steps | Expected |
| --- | --- | --- |
| TB1 | Tables & shifts + Table layout create/edit | Clear header/footer; tooltips on labels; no form body horizontal scroll |
| TB2 | Set shape rectangle/round (+ rotation if exposed) | Persists after save and reload |

### 6.4 Partner register address

| # | Steps | Expected |
| --- | --- | --- |
| RG1 | Business step: Places unavailable or skip | **Enter address manually** works |
| RG2 | Places available | Autocomplete suggestions not clipped by modal (portaled to body) |
| RG3 | CSP / Maps scripts on register & add restaurant | No blank Places / console CSP blocks for Maps |

---

## 7. Diner web — discovery search UI

| # | Steps | Expected |
| --- | --- | --- |
| DW1 | Home hero search | Single seamless pill; Cuisine **removed** from hero |
| DW2 | Focus a field | Lifted white focus segment |
| DW3 | Mobile hero | Compact card; When / Guests side by side |
| DW4 | Map view (`/?view=map`) search | Same pill style; Cards/Map toggle inline |
| DW5 | Cuisine filter | In Filters sidebar/drawer only; counts in active filters; cleared by Clear all |
| DW6 | Cuisine landing page | Cuisine filter hidden (cuisine fixed) |
| DW7 | Map + Places autocomplete | Map loads; no “Map unavailable” (`0.73.4`) |

---

## 8. Auth — forgot password & support routing

| # | Steps | Expected |
| --- | --- | --- |
| FP1 | Request reset same address **3× within an hour** | All succeed (email sent / success UI) |
| FP2 | 4th request within the hour | Contact-support message with platform support email |
| FP3 | Reset for `@tablevera.online` account | Email goes to **Support contacts** address (e.g. `support.uzeats@gmail.com`), not the platform-owned mailbox |
| FP4 | Normal diner/partner email | Reset still delivered to that address |
| FP5 | Web + dashboard + diner mobile + merchant mobile forgot-password UIs | Rate-limit / support messaging consistent |

---

## 9. Admin reservations list fixes

| # | Steps | Expected |
| --- | --- | --- |
| AR1 | Delete a reservation; stay on / change page | Deleted row gone; totals not stale |
| AR2 | Search, clear search | Applies as you type; clear restores list |
| AR3 | Jump to `?page=` past last page | Redirects to last valid page |
| AR4 | Multiple bookings same time slot | Stable sort across page changes |

---

## 10. Patch regression (`0.73.3` / `0.73.4`)

| # | Area | Steps | Expected |
| --- | --- | --- | --- |
| P1 | Merchant mobile | Trigger error inside BottomSheet (e.g. invalid table capacity) | Toast visible **above** sheet |
| P2 | Merchant mobile Android | Tap guest Email on reservation / inquiry | Opens mail app |
| P3 | Diner web map | `/?view=map` + Places in search | Map & autocomplete work |

---

## Priority matrix (suggested order)

1. **P0 — booking money/trust path:** Manual approval copy (MA1–MA7), waitlist seat/convert (W1–W9)  
2. **P0 — ops:** Waitlist overdue + expire cascade (W4–W6, WL13–WL15)  
3. **P1 — partner onboarding:** Setup guide / onboarding (SG1–SG18)  
4. **P1 — waitlist UX:** Filters, edit, guest search, diner My waitlist  
5. **P2 — discovery & lists:** Web search pill, overview, reservations columns/badge  
6. **P2 — auth & admin:** Forgot-password limits, admin reservations paging/search  

---

## Bug report template

When filing failures, include:

```
Build / version: 0.74.0
App: web | dashboard | mobile | merchant-mobile | admin
Role: diner | owner | manager | host | admin | super_admin
Restaurant / plan: …
Steps:
1.
Expected:
Actual:
Screenshot / video:
Console / network (if any):
```

---

## Sign-off

| Area | Tester | Pass? | Notes |
| --- | --- | --- | --- |
| Waitlist convert/expire/seat | | | |
| Waitlist partner + merchant UX | | | |
| Diner My waitlist | | | |
| Manual approval guest UX | | | |
| Setup guide / onboarding / admin setup | | | |
| Partner overview + reservations | | | |
| Web discovery search | | | |
| Forgot password / support routing | | | |
| Admin reservations list | | | |
| 0.73.3 / 0.73.4 patches | | | |
