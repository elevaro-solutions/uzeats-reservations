# Store — Learnings & Observations

## [2026-09-14] MMKV for prefs/drafts; SecureStore for tokens
- Zustand persist (`tablevera-app`) and booking drafts (via `@reservations/shared`) share `createMMKV({ id: "tablevera" })`. Auth tokens stay in SecureStore only.
- Why it matters: Clearing MMKV wipes UI prefs and drafts, not session. Never put tokens in Zustand.

## [2026-09-14] Persisted discovery date goes stale
- Full `discovery` object is persisted, including `date`. Default city is hardcoded `"New York"`. Booking clamps dates on mount; search/home do not globally reclamp on launch.
- Why it matters: After days unused, search can still send yesterday’s date until `resetDiscovery` (or similar) runs.

## [2026-09-14] City and near-me are mutually exclusive
- `setLastSearchCity` clears `nearMe` / `lat` / `lng`.
- Why it matters: City and GPS modes are mutually exclusive by store convention — don’t set both expecting them to combine.
