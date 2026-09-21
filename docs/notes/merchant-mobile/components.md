# components — Learnings & Observations

## [2026-09-21] Input hit target must own vertical padding
- Same as diner `Input`: field `paddingVertical` + centered text-height `TextInput` made only the vertical midpoint focusable. Padding lives on the stretched `TextInput`; field `Pressable` calls `focus()`.
- Why it matters: Merchant forms (sign-in, create reservation) shared the broken hit target.

## [2026-09-18] Kit copied from diner
- Unistyles Forest & Gold + DM Sans components live under `src/components/` (duplicated, not shared via package).
- Why it matters: Merchant and diner UIs can diverge without coupling releases.
