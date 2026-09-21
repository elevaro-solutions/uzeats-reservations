# app — Learnings & Observations

## [2026-09-21] Account tab (route still `more`)
- Tab label/icon: **Account** + `UserIcon` (`filled` when focused). Expo route file stays `(tabs)/more.tsx` to avoid rename churn.
- Why it matters: Don’t rename the route unless deep links/tests need it — display name and icon carry the IA.

## [2026-09-18] Thin routes + partner tabs
- Routes under `src/app/` only re-export features. Tabs: Overview | Reservations | Floor | Messages | Account. Waitlist and notifications are stack screens (bell in Overview header; also Account quick links).
- Why it matters: Keep waitlist out of the tab bar per P0 IA; deep links can still open `/waitlist`.
