# features — Learnings & Observations

See also dated entries under `docs/notes/features.md` → `## merchant-mobile (partner app)` and `## merchant-more`.

## [2026-09-22] Shared ops action list vs sheet

- `StatusActionsList` / `StatusActionsSheet` live under `@/components/status-actions-sheet`. Reservations and Waitlist wrap the sheet with domain icons; Floor embeds `StatusActionsList` inside the table BottomSheet (no nested sheet).
- Why it matters: Don’t duplicate action-row styles per feature; don’t nest a second BottomSheet from Floor.

## [2026-09-22] Ops feature files stay near ~200 lines via extracts

- Overview: `SnapshotCard` / `ShortcutButton` / `OverviewTodayContent` + `OverviewSkeleton` (chrome stays; no full-screen Loader). Messages: inbox merge/filter helpers, inbox list body, thread header/list-item, bubble SVG path helpers (theme.radius for round/cluster). More: `roleLabel` helper. Notifications: list body + auth gate. Waitlist: action runners, header, FlashList + RefreshControl like Reservations; list query drops unused fields.
- Why it matters: Keep day-of feature entrypoints scannable; put presentation and pure helpers beside them under `components/` / `helpers/`.

## [2026-09-22] Reservations list query vs detail query

- `RESTAURANT_RESERVATIONS` only needs card fields (id, partySize, slotStart, status, diner name/phone, tables name). Detail uses `PARTNER_RESERVATION` for full guest/booking/table assign data. Don’t re-expand the list selection for fields only the detail screen shows.
- Why it matters: List overfetch slowed FlashList payloads without helping cards.

## [2026-09-22] Floor arriving list teaches the seat flow

- Arriving cards use avatar + party/time meta, primary border + check when armed. Helper subtitle under Arriving sits above a Tables section header; free tables show a white unchecked checkbox (primary border; fills when selected) while others dim and are not pressable. Sheet empty free-table copy points back to the arriving list.
- Why it matters: Selection was only a slate tint with no next-step cue and no separation from the furniture grid — staff need an obvious assign path without dashboard drag-drop.

## [2026-09-22] Floor timing metrics = seated elapsed + turn remaining

- `seatedMinutes` is minutes since `seatedAt`. `turnMinutesRemaining` is expected turn time minus that (dining window left). Status flips to Turning when ≤15 min remain. Sheet labels: “Time seated” / “Until turn”.
- Why it matters: “Turn left” reads like a leftover count; staff need “how long dining” vs “how soon this table frees”.

## [2026-09-22] Floor table sheet mirrors reservation detail actions

- Table details BottomSheet: Status label + chip (no wash banner), guest avatar card (or seat-arriving prompt), seated/turn metric chips, Table facts, then an always-visible Actions list (Complete when not primary, No-show, Cancel). Sticky footer is primary Seat/Complete only. Destructive confirms use `Alert.alert` so nothing nests another Modal.
- Why it matters: Don’t hide day-of secondary actions behind More inside a sheet; don’t nest BottomSheet/Dialog Modals from Floor.

## [2026-09-22] Reanimated skeletons vs absolute FAB

- `Skeleton` uses Reanimated `Animated.View`, which creates a stacking context. On Reservations, the list skeleton painted over the absolute Add FAB even though the FAB is a later sibling. Fix: give the FAB explicit `zIndex` (and matching `elevation` on Android).
- Why it matters: Any screen that shows skeletons under an absolute overlay/FAB needs `zIndex` on the overlay — sibling order alone is not enough.

## [2026-09-21] Loading skeletons keep screen chrome

- Initial load uses feature-scoped skeletons (`*-list-skeleton` / `reservation-detail-skeleton` / `floor-skeleton`) built from `@/components/skeleton`, not `<Loader fullScreen />`. Headers, filters, and top bars stay mounted; Floor keeps the real status legend and shows an area-picker pill bone.
- Why it matters: Don’t reintroduce blocking spinners on ops list screens — mirror diner reservation skeletons, but match merchant card layouts (time/metric block, status pill, floor tiles).

## [2026-09-21] Messages inbox is venue-scoped; notifications are not

- `conversations(restaurantId)` / inquiries use the active venue. `myNotifications` is cross-venue; thread APIs are reservation-scoped. Opening a conversation from a notification for venue B while A is selected looked like an empty Messages tab.
- Fix: `syncActiveRestaurantId` aligns MMKV from `conversation.restaurantId` / notification `data.restaurantId`, queries use confirmed `activeRestaurant?.id`, and multi-venue partners get a toast (`Switched to {name}`).
- Reservation detail had the same bug: it scanned `restaurantReservations(activeRestaurantId)` so “View reservation” for another venue showed not found. Now uses `partnerReservation(id)` (access-checked by reservation’s restaurant) and syncs venue; staff notification payloads include `restaurantId`.
- Why it matters: Mirror Partner Hub’s venue switch when seeding a conversation; don’t assume the inbox lists every message the partner can open — and don’t switch silently.

## [2026-09-21] Waitlist/Floor toast copy is outcome-oriented

- Waitlist Notify/Seat/Remove use `waitlistActionToastCopy` (e.g. `Guest notified`, `Removed from waitlist`) instead of status nouns like `Marked cancelled`. Floor Complete/No-show/Cancel maps API statuses to human labels so `no_show` never appears raw. Message send errors use the shared `Please try again` fallback.
- Why it matters: Staff see the action they took; don’t reuse `Marked ${status}` with underscores.

## [2026-09-21] Add walk-in sheet: RHF + quoted wait floor

- Walk-in BottomSheet uses react-hook-form + Zod with inline `Input` errors, US phone formatting (`formatUsPhoneNational` → E.164), and `PartySizeStepper`. Form resets when the sheet closes.
- `quotedWaitMinutes` is the staff-promised wait (minutes). Server ETA uses it as a floor: `estimatedWaitMinutes = max(formula, quote)` when quote > 0.
- Why it matters: Don’t toast field validation; don’t treat quoted wait as the live ETA — it’s the promise floor. Mirror create-reservation phone helpers.

## [2026-09-21] Account screen = profile hub, not overflow

- `MoreFeature` is labeled Account: header row (smaller title + compact restaurant switcher), horizontal profile without slate fill, “Quick links” + grouped list, Partner Hub `InlineAlert`, text logout behind `Dialog`. Route/folder remain `more`.
- Why it matters: Keep venue switching in the header like Overview; don’t re-box the profile or drop the Partner Hub alert.

## [2026-09-21] Waitlist Add walk-in lives in sticky footer

- Primary CTA is a sticky footer (same pattern as create reservation / detail), not under the header or inside Empty. Empty state is informational only and vertically centered above the footer.
- Why it matters: Don’t reintroduce a top “Add walk-in” that crowds the empty state; thumb-reach footer matches other commit actions.

## [2026-09-21] Reservation detail action hierarchy

- Detail uses list-card patterns: `reservationStatusVisual` pill, time block, sticky primary + More sheet, Dialog for Cancel/No-show. Assign table hidden for completed/cancelled/no_show.
- Why it matters: Don’t reintroduce stacked status buttons on detail; keep destructive actions behind confirm.

## [2026-09-21] Messages thread matches diner chat

- Merchant conversation screen ports the diner bubble path, day dividers, and circular send field. Outgoing is `restaurant` / `staff` / `owner`. Header guest + slot come from `conversation(reservationId)`.
- Website inquiries stay email-only: the row opens a sheet that marks read and uses `mailto:`. There is no in-app reply mutation.
- Why it matters: Don’t invent an inquiry reply API — Partner Hub is the same model.

## [2026-09-21] Create reservation: walk-in auto-seats

- API seats when `seatImmediately || source === 'walkin'`. Create form forces Seat immediately on and disables the Switch for walk-ins so the UI matches that rule; phone source keeps the Switch editable.
- Why it matters: Don’t show a free Switch for walk-ins — the status would still be seated.

## [2026-09-22] Owner guest lastName may be empty

- `ownerGuestInputSchema` allows omitting `lastName`. `User.lastName` is optional; `findOrCreateDiner` stores `''` when blank (no `'-'` placeholder). `mapUser` coerces missing values to `''` for GraphQL `String!`.
- Why it matters: Merchant/dashboard create flows can omit last name without Mongoose validation errors or a fake surname in the UI.

## [2026-09-21] Owner guest lastName vs User model

- Superseded by [2026-09-22]: previously required `User.lastName` forced a `'-'` placeholder for blank guest last names.

## [2026-09-18] Feature folders

- Domains: auth, overview, restaurants, reservations, waitlist, floor, messages, notifications, more.
- Why it matters: Match diner naming (`*.feature.tsx`) so agents can navigate both apps the same way.

## [2026-09-18] Floor furniture UI

- Floor cards live under `features/floor/components/` (card, legend, area filter, sheet). Status washes + capacity buckets; no per-card status dots.
- Why it matters: Split presentation from `floor.feature.tsx` so seating mutations stay easy to find.

## [2026-09-19] Floor queries need a confirmed restaurant

- `floorPlanOps` CastError ("Invalid ID or field value") happened when a stale MMKV `activeRestaurantId` was sent before `myRestaurants` reconciled. Floor now skips until `activeRestaurant` is in the list; error UI is exclusive (no legend/empty underneath).
- Why it matters: Never pass persisted restaurant ids straight into ObjectId lookups.

## [2026-09-19] FloorPlanOps diner CastError from populate

- `getFloorPlanOps` populates `dinerId`; `mapReservation` used `dinerId.toString()` on the User doc → invalid id → `Reservation.diner` `findById` CastError. Fixed with `refId()` for ObjectId-or-populated refs.
- Why it matters: Any query that populates refs before `mapReservation` hits the same bug.

## [2026-09-21] Reservations day headers — no FlashList sticky

- Past/Upcoming use inline day section rows in a flat `FlashList`. Do **not** use `stickyHeaderIndices` on FlashList 2.0.2: hiding in-list clones with `opacity: 0` left large gaps; collapsing them to `height: 0` broke sticky layout; showing both sticky + inline duplicated labels (e.g. two “Tomorrow”s). `hideRelatedCell` exists only in newer FlashList (2.3+).
- Why it matters: Sticky day headers need a FlashList upgrade (or a custom sticky overlay), not opacity/height hacks.
