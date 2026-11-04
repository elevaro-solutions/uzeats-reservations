# Auth — Learnings & Observations

## [2026-11-04] Signed agreement PDFs use frozen version text
- `LegalAgreementVersion` stores `{ key, version, name, bodyHtml }` per published version. `updateLegalAgreement` snapshots the outgoing version before replacing the body, then the new one. `ensureDefaultLegalAgreements` keeps the version 1 snapshot in sync until a superadmin edits it.
- `mySignedLegalAgreementPdf(key)` renders the user's latest acceptance against that version's snapshot plus a signature block. Drawn PNGs are decoded in `signatureImage.ts` (8-bit gray/RGB/RGBA, non-interlaced, flattened onto white) and embedded with FlateDecode. JPEGs embed as-is.
- PDF text uses the standard Type1 fonts (WinAnsi), so non-Latin characters are dropped. A typed name with no Latin letters shows "Signed electronically"; a drawn signature is unaffected.
- Why it matters: Don't render signed copies from the live `LegalAgreement.bodyHtml`. After a version bump it would show text the signer never agreed to.

## [2026-11-04] Agreement signatures, re-sign window, and version 1 baseline
- `register` takes `termsOfUseSignature` and `registerRestaurantPartner` takes `partnerAgreementSignature` (`{ method: typed|drawn, fullName?, signatureDataUrl? }`). The old boolean checkbox fields are gone. `termsOfUseSignature` is optional on the API because diner mobile has no signing step yet. Without it, the account is created with no acceptance row (logged as unsigned). Diner web still requires it in the form. The partner signature stays required.
- `@reservations/shared` resolves to `dist/`. After changing schemas, rebuild it (`tsc -p packages/shared`) or API tests keep running the old Zod schema. `UserAgreementAcceptance` stores the method, typed name, drawn PNG data URL, IP, and user agent.
- A body save bumps `version` and sets `versionPublishedAt`. That field has no schema default on purpose: a default would hand older records a fresh "now" each time they load, and the window would never start.
- Version 1 counts as signed for everyone (`getAgreementCompliance`), so accounts created before signing existed are not locked 7 days after deploy. Only a version 2+ publish starts the 7-day grace → blocked flow for `restaurant_owner`.
- Partner Hub enforces the block in the client only (`DashShell` sends blocked owners to `/agreements/sign`). GraphQL resolvers do not check compliance, and merchant mobile does not enforce it.
- Reminder worker (`agreement-reminders`, daily 15:00 UTC) emails when 1–2 days remain. `User.agreementReminderSent.<key>` = version prevents duplicates. Terms of Use reminders only go to diners with an earlier Terms acceptance.
- Why it matters: Do not add back a `versionPublishedAt` default or drop the version 1 baseline without a migration plan for existing owners.

## [2026-11-04] Platform agreements required at email signup
- `LegalAgreement` keys: `terms_of_use` (diners) and `partner_agreement` (Partner Hub register). Superadmin edits at `/admin/agreements` (TipTap); API seeds defaults on boot until `updatedById` is set.
- `register` requires `acceptedTermsOfUse: true`; `registerRestaurantPartner` requires `acceptedPartnerAgreement: true`. Acceptance is stored in `UserAgreementAcceptance` (userId, key, version, ip, userAgent).
- Public query `legalAgreement(key)` feeds signup modals. Google/phone OTP signup does not gate on these yet.
- Why it matters: Do not drop the boolean from GraphQL inputs — Zod rejects missing acceptance before the user row is created.

## [2026-10-29] Post-login handoff is a preparing overlay, not a toast
- Diner web and Partner Hub `AuthProvider`s set a session-handoff flag after successful login/register (skipped when email verification is next). `SessionPreparing` covers the viewport until the route changes (min ~1.2s, max ~4.5s).
- Partner Hub `/login` no longer returns `null` while redirecting (that was the white screen + “Signed in” toast). Overview, root redirect, admin gate, and DashShell session restore use the same screen instead of a spinner or blank page.
- Why it matters: Client navigation after `setUser` is slow enough to feel broken; a toast on white is not a loader. Do not add `message.success('Signed in')` back on these routes.

## [2026-10-15] Diner self-delete tombstones the User row
- `deleteMyAccount` sets `User.deletedAt` and clears credentials/PII. JWT context and email login treat deleted users as unauthenticated.
- Why it matters: Reservation `dinerId` FKs stay valid for restaurant history without exposing identity.

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
- Why it matters: Stops reset spam (especially when proxy `@tablevera.*` addresses redirect to support) and gives users a clear next step.

## [2026-10-09] Proxy login password resets (@tablevera.online / @tablevera.local)
- `requestPasswordReset` / admin-initiated reset still mint the token on the account email, but delivery for `*@tablevera.online` and `*@tablevera.local` (proxy login addresses) uses platform `supportEmail` (Support contacts). If that contact is also a proxy domain or non-deliverable (`.local` / `.test` / `@example.com`), falls back to `support.uzeats@gmail.com` — SendGrid refuses those addresses.
- Local seed often has `supportEmail=support@reservations.local`; without the fallback, proxy resets never leave the API. Set a real inbox under Admin → Config → Support contacts to receive them.
- Redirected messages include a notice naming the original account; admin create-reset response `email` / message reflect the inbox that actually received the link.
- Why it matters: Proxy / seed addresses are not real user inboxes — ops/support need the reset link.

## [2026-10-03] @tablevera.online password resets go to Support contacts
- Superseded by 2026-10-09 entry: same routing now also covers `@tablevera.local`.

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
