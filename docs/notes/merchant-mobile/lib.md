# lib — Learnings & Observations

## [2026-09-18] todayIsoDate
- `src/lib/dates.helpers.ts` exports `todayIsoDate()` for overview and reservation “today” filters.
- Why it matters: Keep ISO date formatting in one place for ops queries that take `date: String`.
