# Lib — Learnings & Observations

## [2026-09-14] Error helpers are split; prefer lib for forms
- `lib/graphql-errors.ts` is the canonical Apollo error parser (`VALIDATION_ERROR`, `UNAUTHENTICATED`). Auth screens use a thinner `auth-error.helpers.ts`.
- Why it matters: Booking/forms should use `lib/graphql-errors` for field issues; auth won’t get validation-path mapping.

## [2026-09-14] `tomorrowIsoDate` is triplicated
- Canonical copy in `lib/helpers/date-time.helpers.ts`; duplicates in `store/index.ts` and `search/helpers/build-active-filter-chips.helpers.ts`.
- Why it matters: “Tomorrow” semantics can drift if one copy changes.

## [2026-09-14] Global party-size cap vs per-restaurant max
- `lib/party-size.ts` → `MAX_BOOKABLE_PARTY_SIZE = 50` for search pickers / booking validation. Per-restaurant max comes from table helpers separately.
- Why it matters: Don’t assume the global 50 is the restaurant’s bookable max.
