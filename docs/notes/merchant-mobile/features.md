# features — Learnings & Observations

See also dated entries under `docs/notes/features.md` → `## merchant-mobile (partner app)`.

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
