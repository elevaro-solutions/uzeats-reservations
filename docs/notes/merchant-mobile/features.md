# features — Learnings & Observations

See also dated entries under `docs/notes/features.md` → `## merchant-mobile (partner app)`.

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

## [2026-09-21] Owner guest lastName vs User model
- `ownerGuestInputSchema` allows omitting `lastName`, but `User.lastName` is required and Mongoose rejects `''`. `findOrCreateDiner` now stores `'-'` when last name is blank.
- Why it matters: Merchant/dashboard create flows that send empty last name must not surface a raw Mongoose path error.

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
