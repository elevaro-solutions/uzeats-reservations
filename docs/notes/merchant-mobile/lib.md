# lib — Learnings & Observations

## [2026-09-26] todayIsoDate is restaurant-zone aware
- `todayIsoDate(timeZone?)` / `tomorrowIsoDate` / `formatRelativeDayLabel` default to `PLATFORM_TIMEZONE` and use shared `todayIsoInTimeZone` — not device midnight. Reservations “Today” query, list range filter (`calendarDayRange`), day headers, and overview `date` must pass `activeRestaurant.timezone`.
- Why it matters: Device-local “today” disagreed with API day bounds (restaurant IANA) near midnight / traveler phones.

## [2026-09-26] formatSlotDateTime defaults to PLATFORM_TIMEZONE
- `formatSlotDateTime` / `formatSlotTimeParts` take restaurant IANA zone (callers pass `activeRestaurant.timezone`) and default to `PLATFORM_TIMEZONE` — not device locale. Internals use shared `formatTimeInTimeZone` + `DISPLAY_LOCALE`.
- Why it matters: Omitting `timeZone` used to show device-local clocks that disagreed with Partner Hub.
