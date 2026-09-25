# Auth — Learnings & Observations

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
