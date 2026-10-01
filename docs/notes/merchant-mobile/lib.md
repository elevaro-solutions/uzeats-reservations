# lib — Learnings & Observations

## [2026-09-30] Cache Intl.DateTimeFormat in shared tzParts
- Shared `tzParts` keeps one `Intl.DateTimeFormat` per IANA zone. Reservation cards call `formatSlotTimeParts` once per row; without a cache Hermes rebuilt the formatter on every paint and tab switches felt stuck.
- Why it matters: List remaps on every period tab change — formatter allocation dominated the JS commit.

## [2026-09-30] Slot clocks use hmInTimeZone / formatHm12, not toLocaleTimeString
- Shared `formatTimeInTimeZone` / `formatTimePartsInTimeZone` build clocks via `tzParts` → `hmInTimeZone` → `formatHm12`. Merchant `formatSlotTimeParts` delegates to the shared parts helper.
- Why it matters: Hermes/Android can ignore `timeZone` on `toLocaleTimeString` / hour12 `formatToParts` while still honoring it on the day-bucketing `tzParts` path — dinner showed as 3:30 AM on Asia/Tashkent phones while day headers stayed correct.

## [2026-09-26] todayIsoDate is restaurant-zone aware
- `todayIsoDate(timeZone?)` / `tomorrowIsoDate` / `formatRelativeDayLabel` default to `PLATFORM_TIMEZONE` and use shared `todayIsoInTimeZone` — not device midnight. Reservations “Today” query, list range filter (`calendarDayRange`), day headers, and overview `date` must pass `activeRestaurant.timezone`.
- Why it matters: Device-local “today” disagreed with API day bounds (restaurant IANA) near midnight / traveler phones.

## [2026-09-26] formatSlotDateTime defaults to PLATFORM_TIMEZONE
- `formatSlotDateTime` / `formatSlotTimeParts` take restaurant IANA zone (callers pass `activeRestaurant.timezone`) and default to `PLATFORM_TIMEZONE` — not device locale. Internals use shared `formatTimeInTimeZone` / `formatTimePartsInTimeZone` (tzParts path).
- Why it matters: Omitting `timeZone` used to show device-local clocks that disagreed with Partner Hub.
