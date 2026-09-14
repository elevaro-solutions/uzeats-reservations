# Mobile learnings index

Module notes for `apps/mobile/src`. Append dated entries when you hit a gotcha; skip empty noise.

| Module | Notes | Summary |
| --- | --- | --- |
| [app](./app.md) | Expo Router | Thin route files; presentation/auth gestures live in root layout; sign-in path + barrel inconsistencies |
| [assets](./assets.md) | Icons / brand | Hand-rolled Lucide set with manual barrel; dining-style icons live under discovery |
| [components](./components.md) | Shared UI | Partial barrel; toast is sonner-native; BottomSheet is a custom Modal |
| [features](./features.md) | Domains | Auth soft-gate & offline, booking resume/Stripe, discovery SDK, favorite≠save, search mode machine, and more |
| [graphql](./graphql.md) | Apollo / auth transport | Dual fetch for Me/refresh; offline vs 401 diverge; unused shared `BOOK`; sparse cache policies |
| [lib](./lib.md) | Helpers | Split error helpers; triplicated `tomorrowIsoDate`; global vs per-restaurant party size |
| [store](./store.md) | Zustand + MMKV | Prefs/drafts on MMKV, tokens in SecureStore; stale discovery date; city vs near-me |
| [types](./types.md) | TS types | Icon props only — domain types live in features |
