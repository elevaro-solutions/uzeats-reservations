# Merchant mobile learnings index

Module notes for `apps/merchant-mobile/src`. Append dated entries when you hit a gotcha; skip empty noise.

Feature domain notes shared with diner mobile live under `docs/notes/features.md` in `## merchant-*` sections.

| Module | Notes | Summary |
| --- | --- | --- |
| [app](./app.md) | Expo Router | Thin routes; tabs Overview/Reservations/Floor/Messages/Account; waitlist + notifications stack; Android `googleServicesFile` for FCM; dedicated EAS project (`tablevera-merchant`); EAS env `EXPO_PUBLIC_API_URL` preview/prod only |
| [components](./components.md) | Shared UI | Copied Forest & Gold kit from diner mobile; no `@reservations/ui` |
| [features](./features.md) | Domains | Partner ops features; see also `docs/notes/features.md` → merchant-mobile |
| [graphql](./graphql.md) | Apollo / auth | Partner-only SecureStore session; `isPartnerMobileRole` gate |
| [lib](./lib.md) | Helpers | Date helpers, GraphQL error helpers |
| [store](./store.md) | Zustand + MMKV | `activeRestaurantId` only; tokens never in MMKV |

## [2026-09-18] Scaffold notes

- Package `@reservations/merchant-mobile` mirrors diner Expo 57 stack but drops Stripe, Google Sign-In, discovery, and booking.
- Password reset uses `app: "dashboard"` so emails finish on Partner Hub.
- Floor table statuses are derived by `floorPlanOps` — seat/complete/cancel via reservation mutations, not a table-status mutation.
