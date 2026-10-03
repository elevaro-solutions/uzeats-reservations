# components — Learnings & Observations

## [2026-10-03] Toaster must sit above SheetPortalHost
- Root `Toaster` used to mount inside `SheetPortalProvider` children, so Android sheets (`SheetPortalHost` zIndex/elevation 1000) painted over error toasts (e.g. Change table capacity fail while the sheet stayed open). Sonner’s inner elevation cannot beat a sibling host elevation. Mount `Toaster` after `SheetPortalProvider` in a `pointerEvents="box-none"` layer with zIndex/elevation 1100.
- Why it matters: Any toast fired while an Android BottomSheet is open (assign table, floor, waitlist) must stay readable; do not put `Toaster` back under the host.

## [2026-10-01] SegmentedControl rebuilt: `value` is the only state

- Rewrote from the local-`selected` + refs + `measure()` version to a single source of truth (`value` prop). The equal-width thumb animates `translateX` only (via a `progress` shared value); `width` is set once. Do NOT animate `width` — the thumb carries `shadows.soft`, so animating width forced a per-frame layout + shadow recompute (the previous "worst animation").
- Tap retargets the pill in the gesture `onBegin` worklet (UI thread) so it slides even while JS is busy; `onEnd` commits via `runOnJS(onChange)`; `onFinalize(!success)` snaps back on cancel. Gestures memoized on `optionsKey` (option values), not array identity, so Messages' inline `options` don't rebuild them. Labels go through a `memo`'d `Segment` so only the two changed tabs re-layout.
- Consuming screens use `useDeferredValue` for the pane (see reservations.feature) so the list rebuild runs in a non-blocking pass and can't stall the slide.
- Why it matters: A tab tap used to synchronously rebuild ~100 rows + re-render FlashList on the JS thread while the pill tried to animate — the sluggishness this fixes.

## [2026-09-29] KeyboardController for forms + sheets
- Same stack as diner: root `KeyboardProvider`; auth uses `KeyboardAwareScrollView` only (helper footer is not sticky); BottomSheet `keyboardAvoiding` uses library `KeyboardAvoidingView` with `behavior="padding"` (RN KAV fails under edge-to-edge). Sticky footers stay for create-reservation CTA and message composer.
- Why it matters: Auth helper copy must not ride the keyboard; action bars still do.

## [2026-09-29] SheetPortal must notify host on content updates
- Same as diner: mount-once `getNode()` refs freeze portal UI unless `notify()` re-renders the host without changing entry ids (avoids Reanimated enter remount/ANR). Interactive sheet controls need this.
- Why it matters: Android BottomSheets share this portal; stale host content looks like dead taps.

## [2026-09-29] BottomSheet Android: root portal (not Modal) under edge-to-edge
- App has `edgeToEdgeEnabled=true`. RN `Modal` Dialog content bottom does not cover the Expo Router tab bar, leaving a dark hollow strip. Android BottomSheet portals into `SheetPortalProvider` in root `_layout` (`absoluteFill` + zIndex/elevation) instead of Modal; iOS keeps Modal. Sheet needs `zIndex: 1` vs absoluteFill backdrop for close taps; close uses `hitSlop`; Android back via `BackHandler`.
- Why it matters: Modal translucent / screen-height hacks did not fix the gap; only painting above the tab navigator does.

## [2026-09-22] Shared MetaCluster for ops list skeletons
- `MetaCluster` lives under `@/components/skeleton` and is reused by reservation-list and waitlist-list skeletons (icon + label bones). Prefer this over duplicating the cluster inline.
- Why it matters: Ops card skeletons share the same meta row geometry; keep one bone.

## [2026-09-22] StatusActionsSheet + PartySizeStepper are kit
- Day-of “More actions” rows use `StatusActionsSheet` / `StatusActionsList`. Party size steppers use `@/components/PartySizeStepper` (not a reservations-private import). Guest first+last display uses `guestDisplayName` from `@/lib/helpers`.
- Why it matters: Waitlist/Floor must not deep-import reservations private components for shared primitives.

## [2026-09-21] Input hit target must own vertical padding
- Same as diner `Input`: field `paddingVertical` + centered text-height `TextInput` made only the vertical midpoint focusable. Padding lives on the stretched `TextInput`; field `Pressable` calls `focus()`.
- Why it matters: Merchant forms (sign-in, create reservation) shared the broken hit target.

## [2026-09-18] Kit copied from diner
- Unistyles Forest & Gold + DM Sans components live under `src/components/` (duplicated, not shared via package).
- Why it matters: Merchant and diner UIs can diverge without coupling releases.
