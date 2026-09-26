# App — Learnings & Observations

## [2026-09-26] EAS needs babel-preset-expo as a direct dependency
- Same as merchant: pnpm + EAS Release bundle cannot resolve `babel-preset-expo` unless it’s in app `dependencies`. Missing preset surfaces as Metro `transformFile` of undefined.
- Why it matters: Don’t rely on transitive `expo` linkage for Babel presets under pnpm on EAS.

## [2026-09-26] EAS must build @reservations/shared (dist is gitignored)
- Same as merchant: `@reservations/shared` points at gitignored `dist/`. `eas-build-post-install` runs `pnpm --filter @reservations/shared build` from monorepo root before Metro embed.
- Why it matters: Clean EAS clones fail `@reservations/shared` resolution without the hook.

## [2026-09-18] Photo library usage string is native-only; Metro won’t save you
- iOS kills the process (TCC) if `NSPhotoLibraryUsageDescription` is missing when `expo-image-picker` opens the library — not a JS exception. `app.config.js` / the `expo-image-picker` plugin only apply after `expo prebuild` / `expo run:ios` regenerates `ios/Tablevera/Info.plist` (gitignored).
- The review-photos merge also dropped the opening `[` on the `expo-splash-screen` plugin entry, so `require(app.config.js)` threw `Unexpected string` until fixed.
- Why it matters: Adding review photos in JS without a native rebuild looks fine until “Add photos” is tapped.

## [2026-09-17] EAS projectId must exist on Expo; dynamic config won't auto-write
- A hardcoded `extra.eas.projectId` that doesn't exist on Expo makes `eas init` / `eas project:info` fail with “Experience … does not exist” while still claiming the project is “already linked.” Remove the dead ID, run `eas init`, then paste the new UUID into `app.config.js` (EAS cannot rewrite dynamic JS configs).
- Live project: `@xondamir/tablevera` → `16386e83-34eb-4a95-8c46-2ec3c9b6d423`.
- Why it matters: Push tokens and the Expo dashboard both require a real project; local slug/`owner` alone is not enough.

## [2026-09-16] Android prebuilt expo-linear-gradient AAR vs expo-modules-core
- `expo-linear-gradient@15.0.8` ships a prebuilt AAR that references `expo.modules.kotlin.types.LazyKType`. That class is not in `expo-modules-core@57.0.13`, so Android startup crashes with `NoClassDefFoundError` (the overlay often blames `LinearGradientModule` itself).
- Fix: `package.json` → `expo.autolinking.android.buildFromSource: ["expo-linear-gradient"]`, then clean `expo run:android`. Build log should list `expo-linear-gradient` without the `[📦]` prebuilt marker.
- Why it matters: A successful Gradle install is not enough if prebuilt AARs were compiled against a newer modules-core than the app links.

## [2026-09-14] Thin routes; presentation lives in root layout
- Expo Router files under `apps/mobile/src/app/` are mostly one-line feature mounts. Gesture/presentation policy (auth slides from bottom; booking confirmation `gestureEnabled: false`) lives in `app/_layout.tsx`, not in the feature screen.
- Why it matters: Changing “how a screen feels” is a root-layout change. Auth-group presentation differs from in-stack `/sign-in` pushes.

## [2026-09-14] Sign-in path + barrel inconsistencies
- Features push `pathname: "/sign-in"` with a `next` return path (inbox/settings aligned as of 2026-09-16). Some nested routes deep-import feature files instead of the `@/features` barrel (`features/index.ts` is not the full public surface).
- Why it matters: Prefer one sign-in path convention; `next` return paths are validated via `isSafeInternalPath`. Deep imports for nested screens are intentional — don’t assume the barrel lists everything.
