# Mobile learnings index

Module notes for `apps/mobile/src`. Append dated entries when you hit a gotcha; skip empty noise.

Merchant mobile notes live under [`merchant-mobile/LEARNINGS.md`](./merchant-mobile/LEARNINGS.md).

| Module | Notes | Summary |
| --- | --- | --- |
| [app](./app.md) | Expo Router | Thin route files; presentation/auth gestures live in root layout; sign-in path + barrel inconsistencies; EAS builds `@reservations/shared` via post-install; keyboard via `react-native-keyboard-controller` + root `KeyboardProvider` |
| [assets](./assets.md) | Icons / brand | Hand-rolled Lucide set with manual barrel; dining-style icons live under discovery |
| [components](./components.md) | Shared UI | Partial barrel; toast is sonner-native; BottomSheet is Modal on iOS / SheetPortal on Android; keyboard forms use KeyboardController |
| [features](./features.md) | Domains | Discovery SDK, favorite≠save, search mode machine, push, reservations (list/detail restaurant TZ), waitlist convert/expire + `/waitlist`, and more |
| [features-auth](./features-auth.md) | Auth | Diners edit profile via `updateMyProfile`; Google email locked until Switch to email (`unlinkGoogle`); Google re-link only via `linkGoogle` |
| [features-booking](./features-booking.md) | Booking | Draft resume=`1` from profile + booking gates; Stripe stubs; availability uncached |
| [features-virtual-room](./features-virtual-room.md) | Virtual 3D room (experimental) | Add-on in `Subscription.addons`, not plan features; monthly price snapshotted per billed month; 3D guest fee billed only on completion; scene built from published floor plan; KIRI scan optional |
| [graphql](./graphql.md) | Apollo / auth transport | Dual fetch for Me/refresh; owner tickets are `createOwnerSupportTicket`; Apollo 4 `loading` is true during polls; partner `restaurantReservations` period/status filters use restaurant TZ; offline refresh no longer hard-signs-out; unused shared `BOOK`; sparse cache policies |
| [lib](./lib.md) | Helpers | Split error helpers; `formatSlotDateTime` / discovery tomorrow default to `PLATFORM_TIMEZONE`; global vs per-restaurant party size |
| [store](./store.md) | Zustand + MMKV | Prefs/drafts on MMKV, tokens in SecureStore; discovery default date is platform tomorrow; city vs near-me |
| [types](./types.md) | TS types | Icon props only — domain types live in features |
