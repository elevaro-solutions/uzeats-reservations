# Auth — Learnings & Observations

## [2026-09-14] Soft gate; offline ≠ signed out
- Tabs are browsable logged out. Auth layout redirects only when `user` is set. `sessionOffline && !user` is treated as offline on profile/reservations, not as signed out.
- Why it matters: Tokens can exist with `user === null` offline — don’t treat missing user as definite logout.

## [2026-09-14] Google Sign-In is env-gated
- Needs `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (+ iOS client id on iOS). Logout best-effort `GoogleSignin.signOut` after SecureStore clear.
- Why it matters: Missing env fails the Google button at runtime; local logout still clears tokens.
