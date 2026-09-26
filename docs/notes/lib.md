# Lib — Learnings & Observations

## [2026-09-26] formatSlotDateTime defaults to PLATFORM_TIMEZONE
- Omitting `timeZone` used to format in the device zone while reservation helpers defaulted to `PLATFORM_TIMEZONE`. Now `formatSlotDateTime` / `formatSlotTime` / `formatSlotDateLong` default to `PLATFORM_TIMEZONE` via shared `formatTimeInTimeZone` / `formatUsDate`.
- Why it matters: Forgotten args no longer silently diverge between home/booking and Reservations tab.

## [2026-09-26] tomorrowIsoDate consolidated on platform zone
- Store discovery default and search filter-chip clear use `tomorrowIsoDate(PLATFORM_TIMEZONE)` from `lib/helpers/date-time.helpers.ts` (no local device-midnight copies).
- Why it matters: Multi-venue discovery “tomorrow” matches platform ET, not the diner’s phone calendar.

## [2026-09-14] Error helpers are split; prefer lib for forms
- `lib/graphql-errors.ts` is the canonical Apollo error parser (`VALIDATION_ERROR`, `UNAUTHENTICATED`). Auth screens use a thinner `auth-error.helpers.ts`.
- Why it matters: Booking/forms should use `lib/graphql-errors` for field issues; auth won’t get validation-path mapping.

## [2026-09-14] Global party-size cap vs per-restaurant max
- `lib/party-size.ts` → `MAX_BOOKABLE_PARTY_SIZE = 50` for search pickers / booking validation. Per-restaurant max comes from table helpers separately.
- Why it matters: Don’t assume the global 50 is the restaurant’s bookable max.
