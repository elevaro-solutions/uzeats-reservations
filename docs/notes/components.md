# Components — Learnings & Observations

## [2026-09-21] Input hit target must own vertical padding
- Field wrappers with `minHeight` + `paddingVertical` + `alignItems: "center"` leave `TextInput` at text-line height; taps above/below the glyph miss focus. Vertical padding belongs on the `TextInput`, which should `alignSelf: "stretch"`, and the field `Pressable` should `focus()` the input.
- Why it matters: Otherwise only the vertical center of the control focuses.

## [2026-09-14] Partial barrel; toast is sonner, not local
- `@/components` exports the interactive kit; skeletons import from `@/components/skeleton`. Toasts use `sonner-native` (`Toaster` in root layout); `components/toast/` is an empty stub.
- Why it matters: Don’t look for a local Toast component. Skeleton is intentionally off-barrel.

## [2026-09-14] BottomSheet is a custom Modal, not @gorhom
- `components/bottom-sheet` is Modal + Reanimated slide with backdrop / loading / `padded` semantics — not snap points or pan-to-dismiss from a third-party sheet library.
- Why it matters: Expect those props and behaviors; don’t assume @gorhom APIs.
