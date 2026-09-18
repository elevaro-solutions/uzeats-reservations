# store — Learnings & Observations

## [2026-09-18] Active restaurant on MMKV
- Persist `activeRestaurantId` in Zustand/MMKV (`tablevera-merchant`). Auth tokens stay in SecureStore only.
- Why it matters: Every ops query takes `restaurantId` from the store — there is no server-side switch mutation.
