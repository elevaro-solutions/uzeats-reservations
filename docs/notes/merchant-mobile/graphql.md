# graphql — Learnings & Observations

## [2026-10-01] Host is a partner mobile role
- `PARTNER_MOBILE_ROLES` includes `host` with owner/manager. Login reject message mentions hosts.
- Why it matters: Hosts are FOH — they need the merchant app for day-of ops, not only dashboard.

## [2026-09-18] Partner-only session gate
- Login and `refreshMe` reject non-`restaurant_owner`/`staff` via `isPartnerMobileRole` and clear SecureStore tokens. No Google/register in P0.
- Why it matters: API `login` accepts any role; merchant app must enforce client-side like dashboard.
