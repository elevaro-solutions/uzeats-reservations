# features — Learnings & Observations

See also dated entries under `docs/notes/features.md` → `## merchant-mobile (partner app)`.

## [2026-09-18] Feature folders
- Domains: auth, overview, restaurants, reservations, waitlist, floor, messages, notifications, more.
- Why it matters: Match diner naming (`*.feature.tsx`) so agents can navigate both apps the same way.

## [2026-09-18] Floor furniture UI
- Floor cards live under `features/floor/components/` (card, legend, area filter, sheet). Status washes + capacity buckets; no per-card status dots.
- Why it matters: Split presentation from `floor.feature.tsx` so seating mutations stay easy to find.
