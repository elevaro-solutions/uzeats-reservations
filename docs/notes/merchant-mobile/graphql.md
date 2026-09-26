# graphql — Learnings & Observations

## [2026-09-18] Partner-only session gate
- Login and `refreshMe` reject non-`restaurant_owner`/`staff` via `isPartnerMobileRole` and clear SecureStore tokens. No Google/register in P0.
- Why it matters: API `login` accepts any role; merchant app must enforce client-side like dashboard.
