# Components — Learnings & Observations

## [2026-10-01] SegmentedControl: UI-thread thumb, `value` is the only state
- Rebuilt to a single source of truth (`value` prop) — no duplicate `selected` state, refs, or `measure()` fallback. The thumb is equal-width, so only `translateX` animates (via `progress` shared value); `width` is set once. Never animate `width` here: the thumb carries `shadows.soft`, and animating width forces per-frame layout + shadow recompute (the old jank).
- Tap moves the pill in the gesture `onBegin` worklet (UI thread), so it slides even while JS is busy; `onEnd` commits via `runOnJS`; `onFinalize(!success)` snaps back on cancel. Gestures are memoized on `optionsKey` (option values), not array identity, so inline `options` props don't rebuild them. Labels render through a `memo`'d `Segment` so only the two changed tabs re-layout.
- Pair with `useDeferredValue` on the consuming screen (see reservations) so the pane's heavy re-render runs in a non-blocking pass and can't stall the slide.
- Why it matters: Reservations tabs were sluggish because a tap synchronously rebuilt the list on the JS thread while the pill animation competed for the same frames.

## [2026-09-29] KeyboardController for forms + BottomSheet
- Stock RN `KeyboardAvoidingView` fails under Android edge-to-edge. App uses `react-native-keyboard-controller`: root `KeyboardProvider`; form screens use `KeyboardAwareScrollView`; auth helper footers are plain (not sticky); action footers (booking, messages, review) use `KeyboardStickyView`. BottomSheet `keyboardAvoiding` uses the library’s `KeyboardAvoidingView` with `behavior="padding"` on both platforms.
- Why it matters: Sticky auth helpers collided with in-form links/CTAs under the keyboard.

## [2026-09-29] SheetPortal must notify host on content updates
- `SheetPortal` stores children in a ref and mounts once (stable entry id) so Reanimated enter does not remount/ANR. Without `portalStore.notify()` on each `SheetPortal` render, the host never re-reads `getNode()` — Android sheet UI freezes (e.g. booking confirm terms checkbox toggles state but stays visually unchecked until close/reopen). Use `useLayoutEffect` + `notify()`; do not remount the entry.
- Why it matters: Any interactive control inside an Android BottomSheet depends on this.

## [2026-09-29] BottomSheet Android: root portal (not Modal) under edge-to-edge
- Same fix as merchant-mobile: RN `Modal` Dialog leaves a hollow strip above the tab bar on Android. Diner BottomSheet portals into `SheetPortalProvider` in root `_layout` on Android; iOS keeps Modal. Sheet `zIndex: 1` vs absoluteFill backdrop; close `hitSlop`; hardware back via portal host `BackHandler`. Mount once via `getNode()` refs — remounting on every parent render restarts Reanimated enter and can ANR.
- Why it matters: Filters, booking, location, and other sheets share this kit.

## [2026-09-21] Input hit target must own vertical padding
- Field wrappers with `minHeight` + `paddingVertical` + `alignItems: "center"` leave `TextInput` at text-line height; taps above/below the glyph miss focus. Vertical padding belongs on the `TextInput`, which should `alignSelf: "stretch"`, and the field `Pressable` should `focus()` the input.
- Why it matters: Otherwise only the vertical center of the control focuses.

## [2026-09-14] Partial barrel; toast is sonner, not local
- `@/components` exports the interactive kit; skeletons import from `@/components/skeleton`. Toasts use `sonner-native` (`Toaster` in root layout); `components/toast/` is an empty stub.
- Why it matters: Don’t look for a local Toast component. Skeleton is intentionally off-barrel.

## [2026-09-14] BottomSheet is a custom Modal, not @gorhom
- `components/bottom-sheet` is Modal + Reanimated on iOS; on Android it portals via `SheetPortal` (see 2026-09-29 note) — not @gorhom snap points.
- Why it matters: Expect those props and behaviors; don’t assume @gorhom APIs.
