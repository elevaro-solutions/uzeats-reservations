# components — Learnings & Observations

## [2026-09-22] Shared MetaCluster for ops list skeletons
- `MetaCluster` lives under `@/components/skeleton` and is reused by reservation-list and waitlist-list skeletons (icon + label bones). Prefer this over duplicating the cluster inline.
- Why it matters: Ops card skeletons share the same meta row geometry; keep one bone.

## [2026-09-22] StatusActionsSheet + PartySizeStepper are kit
- Day-of “More actions” rows use `StatusActionsSheet` / `StatusActionsList`. Party size steppers use `@/components/PartySizeStepper` (not a reservations-private import). Guest first+last display uses `guestDisplayName` from `@/lib/helpers`.
- Why it matters: Waitlist/Floor must not deep-import reservations private components for shared primitives.

## [2026-09-21] Input hit target must own vertical padding
- Same as diner `Input`: field `paddingVertical` + centered text-height `TextInput` made only the vertical midpoint focusable. Padding lives on the stretched `TextInput`; field `Pressable` calls `focus()`.
- Why it matters: Merchant forms (sign-in, create reservation) shared the broken hit target.

## [2026-09-18] Kit copied from diner
- Unistyles Forest & Gold + DM Sans components live under `src/components/` (duplicated, not shared via package).
- Why it matters: Merchant and diner UIs can diverge without coupling releases.
