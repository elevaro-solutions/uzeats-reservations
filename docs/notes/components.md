# Components — Learnings & Observations

## [2026-09-14] Partial barrel; toast is sonner, not local
- `@/components` exports the interactive kit; skeletons import from `@/components/skeleton`. Toasts use `sonner-native` (`Toaster` in root layout); `components/toast/` is an empty stub.
- Why it matters: Don’t look for a local Toast component. Skeleton is intentionally off-barrel.

## [2026-09-14] BottomSheet is a custom Modal, not @gorhom
- `components/bottom-sheet` is Modal + Reanimated slide with backdrop / loading / `padded` semantics — not snap points or pan-to-dismiss from a third-party sheet library.
- Why it matters: Expect those props and behaviors; don’t assume @gorhom APIs.
