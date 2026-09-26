# app — Learnings & Observations

## [2026-09-26] EAS must build @reservations/shared (dist is gitignored)
- `@reservations/shared` `main`/`exports` point at `dist/index.js`, but `dist/` is root-gitignored. EAS clones have no dist → Metro fails resolving `@reservations/shared` during `expo export:embed`.
- Fix: `eas-build-post-install` in app `package.json` runs `pnpm --filter @reservations/shared build` from the monorepo root (same hook on diner `apps/mobile`).
- Why it matters: Local machines often have leftover `packages/shared/dist` from turbo/dev; EAS workers do not. Don’t commit dist — keep the hook.

## [2026-09-26] EAS env: EXPO_PUBLIC_API_URL on preview/production only
- Dashboard env on `@xondamir/tablevera-merchant`: `EXPO_PUBLIC_API_URL=https://api.tablevera.online/graphql` for preview + production. Development intentionally omitted → `config.ts` falls back to `http://localhost:4000/graphql`.
- Same URL is also in `eas.json` `build.preview|production.env` (parity with diner). Merchant has no Google/Stripe/Maps vars.
- Why it matters: OTA / EAS Update and dashboard-driven builds pick up dashboard env; leaving development unset keeps local Metro on localhost.

## [2026-09-23] Dedicated EAS project (not diner tablevera)
- `extra.eas.projectId` must match slug `tablevera-merchant`. Reusing the diner ID (`16386e83-…` / slug `tablevera`) fails `eas build` with a slug mismatch.
- Merchant project: `@xondamir/tablevera-merchant` → `9df93ad5-d9cb-47d7-9d72-35513f8c81e3`. `eas.json` sets `cli.appVersionSource: "remote"`.
- Why it matters: Dynamic `app.config.js` cannot be auto-written by `eas init` — paste the new `projectId` manually after init.

## [2026-09-23] Android google-services.json is committed; wire via googleServicesFile
- `android.googleServicesFile` → `./google-services.json` (client config; tracked). Includes `uz.alitech.tablevera.merchant` under Firebase project `uzeats-app`. Do **not** easignore/gitignore the client file or Android FCM registration fails; ignore only `*firebase-adminsdk*.json` / `*service-account*.json` (EAS credentials upload).
- Why it matters: Push bootstrap needs a native rebuild after this config change; Expo Go / OTA alone won’t register FCM.

## [2026-09-22] App icons + splash + auth wordmark
- Source of truth: `assets/android-app-icon/`, `assets/ios-app-icon.icon`, `assets/brand/tablevera-merchant-logo.svg` (embedded for `TableveraLogo`). Splash/`expo.icon` reuse Android foreground.
- Native `ios/TableveraMerchant/ios-app-icon.icon` and `SplashScreenLogo.imageset` are **copied/generated into the prebuild tree** — updating `assets/` alone does not change the home-screen icon or splash until those native files are synced (`expo prebuild` or copy) and the app is rebuilt. Metro alone updates only the in-app auth wordmark.
- Why it matters: After icon/splash asset changes, sync native copies + rebuild (`expo run:ios --no-build-cache`); simulator home screen may also cache the old icon until a clean install.

## [2026-09-21] Account tab (route still `more`)
- Tab label/icon: **Account** + `UserIcon` (`filled` when focused). Expo route file stays `(tabs)/more.tsx` to avoid rename churn.
- Why it matters: Don’t rename the route unless deep links/tests need it — display name and icon carry the IA.

## [2026-09-18] Thin routes + partner tabs
- Routes under `src/app/` only re-export features. Tabs: Overview | Reservations | Floor | Messages | Account. Waitlist and notifications are stack screens (bell in Overview header; also Account quick links).
- Why it matters: Keep waitlist out of the tab bar per P0 IA; deep links can still open `/waitlist`.
