# app — Learnings & Observations

## [2026-09-18] Thin routes + partner tabs
- Routes under `src/app/` only re-export features. Tabs: Overview | Reservations | Floor | Messages | More. Waitlist and notifications are stack screens (bell in Overview header).
- Why it matters: Keep waitlist out of the tab bar per P0 IA; deep links can still open `/waitlist`.
