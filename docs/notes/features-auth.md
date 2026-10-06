# Auth — Learnings & Observations

## [2026-10-05] Google login does not auto-link email/password accounts
- `loginWithGoogle` creates a new Google diner or signs in when `googleId` already matches. If the Google email matches an existing account **without** `googleId`, it returns `ConflictError` (`field: email`) and does not set `googleId`. Signed-in diners re-attach Google via `linkGoogle(idToken)`; Google email must match the profile email and be verified. Profile editors expose “Link Google” when `hasGoogle` is false.
- Why it matters: After Switch to email (or any email/password account), Continue with Google must not silently re-bind. Explicit link from Profile is the supported path.

## [2026-10-05] Switch to email sign-in (unlink Google)
- `updateMyProfile.unlinkGoogle` clears `googleId`. Requires an existing `passwordHash` or `newPassword` in the same request so the diner is not locked out. After unlink, email edits are allowed. Clients expose “Switch to email sign-in” / “Keep Google sign-in” on the profile editor.
- Why it matters: Do not unlink Google without a password path. Re-login with Google after unlink does not auto-relink (see entry above); use `linkGoogle` from Profile.

## [2026-10-05] Google-linked profiles lock email
- `User.hasGoogle` is true when `googleId` is set. `updateMyProfile` rejects email changes while Google is linked (`ValidationError` / `field: email`) unless `unlinkGoogle` is also sent. Clients disable the email field until the diner chooses Switch to email sign-in. Explicit `linkGoogle` onto an existing email account requires Google `email_verified` and a matching profile email.
- Why it matters: Continue with Google stays the identity while linked. Do not let the profile email diverge while `googleId` remains.

## [2026-10-05] Profile street field uses address autocomplete
- Web profile Street address is `AddressAutocomplete` bound to `line1`. After a suggestion is chosen, the shared helper writes the street line (not the full formatted place) back into the input, then fills city / state / ZIP.
- Why it matters: A separate “Find address” + “Street” pair was confusing; one street field is enough when selection corrects the value.

## [2026-10-04] Diners edit their own account
- `updateMyProfile` updates the signed-in user's photo (`avatarUrl`), name, email, phone, address, and password. Web and mobile open that editor from an Edit button on the profile photo and info card. Email or password changes require `currentPassword` when `passwordHash` is set. Google-linked accounts cannot change email (see 2026-10-05). A wrong current password is `ValidationError` (`field: currentPassword`), not `UNAUTHENTICATED`, so clients do not refresh the session.
- A new email sets `emailVerified` false and sends a verification code only when signup verification is required. A new or cleared phone sets `phoneVerified` false. Empty `phone` unsets it; `clearAddress` unsets the home address. Duplicate email/phone reuse the register conflict messages.
- Password change does not clear `refreshTokens` (the emailed reset flow does), so the diner stays signed in. Impersonation cannot call this mutation.
- Why it matters: Web profile and mobile Personal info are the diner self-serve path. Do not route those edits through guest CRM (`updateGuestProfile`).

## [2026-10-04] Diner email signup requires a phone
- `registerSchema.phone` and GraphQL `RegisterInput.phone` are required. Google sign-in still creates a diner with no phone.
- Duplicate phones return `ConflictError` with `extensions.field = phone` (same pattern as duplicate email).
- Why it matters: Email signup must send E.164 (`+1…`). Test helper `registerUser` fills a unique phone when callers omit one.

## [2026-10-03] Forgot-password: 3 emails/hour then contact support
- `requestPasswordReset` returns `PasswordResetRequestPayload` with `attemptsUsed` / `attemptsRemaining` / `maxAttempts` / `supportEmail`. Counts are stored in `PasswordResetAttempt` (1h window, max 3) for any email (including unknown) so enumeration stays flat.
- Clients show Resend while remaining > 0; at 0 they show mailto support (platform Support contacts email).
- Why it matters: Stops reset spam (especially when `@tablevera.online` redirects to support) and gives users a clear next step.

## [2026-10-03] @tablevera.online password resets go to Support contacts
- `requestPasswordReset` / admin-initiated reset still mint the token on the account email, but delivery for `*@tablevera.online` uses platform `supportEmail` (Support contacts). If that contact is also `@tablevera.online`, falls back to `support.uzeats@gmail.com`.
- Redirected messages include a notice naming the original account; admin create-reset response `email` / message reflect the inbox that actually received the link.
- Why it matters: Platform-owned addresses are not reliable user inboxes — ops/support need the reset link.

## [2026-10-03] Partner landing is `/overview`
- `partnerLandingPath` for owners/managers is `/overview` (was `/`). Hosts still land on `/reservations`; platform admins on `/admin`. Root `/` redirects via the same helper.
- Why it matters: Deep links and post-login redirects should use `partnerLandingPath`, not hard-coded `/`.

## [2026-10-01] Host role is FOH-scoped Partner Hub
- `host` is a venue staff role (with `manager`) — assigned via `restaurantIds`, consumes package team seats, invitable from Team / admin.
- Dashboard allowlist: `/reservations` (login landing; book defaults to today), `/waitlist`, `/floor-ops`, `/guests`, `/messages`, `/support`, `/notifications`. Deposits are handled on reservation detail, not a separate settings page. Overview (`/` / `/overview`) is blocked.
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
