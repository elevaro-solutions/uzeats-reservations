# App — Learnings & Observations

## [2026-09-14] Thin routes; presentation lives in root layout
- Expo Router files under `apps/mobile/src/app/` are mostly one-line feature mounts. Gesture/presentation policy (auth slides from bottom; booking confirmation `gestureEnabled: false`) lives in `app/_layout.tsx`, not in the feature screen.
- Why it matters: Changing “how a screen feels” is a root-layout change. Auth-group presentation differs from in-stack `/sign-in` pushes.

## [2026-09-14] Sign-in path + barrel inconsistencies
- Most features push `pathname: "/sign-in"`; notification settings uses `"/(auth)/sign-in"`. Some nested routes deep-import feature files instead of the `@/features` barrel (`features/index.ts` is not the full public surface).
- Why it matters: Prefer one sign-in path convention; `next` return paths are validated via `isSafeInternalPath`. Deep imports for nested screens are intentional — don’t assume the barrel lists everything.
