# GraphQL — Learnings & Observations

## [2026-09-16] Offline launch vs mid-request 401 aligned
- `refreshMe` keeps tokens and sets `sessionOffline` on network refresh failure. Apollo `errorLink` on `UNAUTHENTICATED` clears tokens only when refresh fails with `reason !== "network"` (invalid/rejected refresh), matching cold-start behavior.
- Why it matters: Flaky networks during GraphQL calls no longer wipe a still-valid session.

## [2026-09-14] Dual transport for auth vs Apollo
- Apollo handles most ops; session bootstrap (`Me`) and token refresh use raw `fetch` + inline GraphQL strings. The `ME` document in `operations.ts` is unused for bootstrap.
- Why it matters: Auth session can succeed/fail independently of Apollo cache — don’t assume `me` is in InMemoryCache after launch.

## [2026-09-14] Sparse but load-bearing cache policies
- `Address` uses `merge: true` (no id). `Table` uses `keyFields: ["id"]`. `bookableTables` keys on `restaurantId/slotStart/partySize` and replaces incoming.
- Why it matters: Without Address merge, SEARCH vs MY_RESERVATIONS selections fight. Table lists must not rely on append-merge.

## [2026-09-14] Shared `BOOK` is unused by the booking flow
- `operations.ts` exports `BOOK` (`createReservation`), but live booking uses richer `CREATE_RESERVATION` in `features/booking/api/booking.operations.ts`. Password reset hardcodes `app: "web"` in `graphql/auth.tsx` (API only accepts `web` | `dashboard`).
- Why it matters: Editing shared `BOOK` won’t affect booking. Reset email/deeplink may target web until mobile deep links exist.
