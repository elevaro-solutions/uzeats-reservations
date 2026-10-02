# Auth — Learnings & Observations

## [2026-10-01] Host role is FOH-scoped Partner Hub
- `host` is a venue staff role (with `manager`) — assigned via `restaurantIds`, consumes package team seats, invitable from Team / admin.
- Dashboard allowlist: `/reservations` (login landing; book defaults to today), `/waitlist`, `/floor-ops`, `/guests`, `/messages`, `/support`, `/notifications`. Deposits are handled on reservation detail, not a separate settings page.
- Shared helpers: `isHostRole`, `isVenueStaffRole`, `canAccessPartnerPath`, `partnerLandingPath`. Merchant mobile accepts hosts via `PARTNER_MOBILE_ROLES`.
- Why it matters: Don’t give hosts Settings/Billing/Grow; don’t treat host like diner for Partner Hub chrome.

## [2026-10-01] Field-level GraphQL auth errors
- Conflict / validation / invalid-credentials errors now carry `extensions.field` (e.g. `email`, `password`, `referralCode`, `name`). Clients use `getGraphQLFieldErrors` (web/dashboard) or `applyAuthFieldErrors` (mobile) to set Ant Design / RHF field errors; toast/banner is only for non-field failures.
- Why it matters: Duplicate-email register previously surfaced as a toast after the API stopped masking it — diners/partners still had to guess which input failed.

## [2026-09-30] Duplicate-email register must throw ConflictError
- `registerWithEmail` previously used plain `Error`; production GraphQL `formatError` rewrote it to `"Internal server error"`. Now throws `ConflictError('Email already registered')` (same for partner register).
- Why it matters: Web/mobile already map that exact string — the API had to stop masking it.

## [2026-09-29] AuthScreen keyboard avoidance
- `AuthScreen` uses `KeyboardAwareScrollView` for form fields only. The account helper footer is a normal pinned footer (not `KeyboardStickyView`) so it stays at the screen bottom and can sit under the keyboard — sticky footers were colliding with “Forgot Password?” / primary CTAs.
- Why it matters: Matches merchant auth; sticky is for action bars (messages, create reservation), not auth helper links.

## [2026-09-29] Android Google Sign-In: OAuth GCP ≠ Firebase FCM
- Diner uses GCP project `836445078330` for OAuth (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` + Android/iOS clients) and Firebase `uzeats-app` only for FCM (`google-services.json` can have empty `oauth_client`).
- `GoogleSignin.configure` uses the **Web** client id only; `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` is not read at runtime. `DEVELOPER_ERROR` after account pick = package + signing SHA-1 mismatch on the **OAuth** Android client.
- Local `expo run:android` signs with `android/app/debug.keystore` SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` — different from EAS/Play fingerprints; register both. Stale `android/` with wrong `applicationId` (e.g. `com.tablevera.app`) also breaks Sign-In; regenerate via `expo prebuild`.
- Why it matters: Fixing Firebase alone or swapping Android client id in env won’t clear `DEVELOPER_ERROR`.

## [2026-09-25] Duplicate-email register message
- API throws `Email already registered`. Diner web must use `getGraphQLErrorMessage` (Apollo CombinedGraphQLErrors); mobile `getAuthErrorMessage` wraps the shared GraphQL helper and maps that string to “Sign in or use a different email.”
- Why it matters: `err instanceof Error` alone often surfaces a generic Apollo wrapper, not the API message.

## [2026-09-14] Soft gate; offline ≠ signed out
- Tabs are browsable logged out. Auth layout redirects only when `user` is set. `sessionOffline && !user` is treated as offline on profile/reservations, not as signed out.
- Why it matters: Tokens can exist with `user === null` offline — don’t treat missing user as definite logout.

## [2026-09-14] Google Sign-In is env-gated
- Needs `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (+ iOS client id on iOS). Logout best-effort `GoogleSignin.signOut` after SecureStore clear.
- Why it matters: Missing env fails the Google button at runtime; local logout still clears tokens.

## [2026-09-15] Terms toggle links without flipping the switch
- Sign-up `TermsToggle` keeps the switch on its own `Pressable`; nested “Terms” / “Privacy Policy” text navigates to `/terms` and `/privacy`.
- Why it matters: Tapping a legal link must not accidentally toggle agreement.
