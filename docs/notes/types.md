# Types — Learnings & Observations

## [2026-09-14] Module is icon props only
- `types/` is essentially `IconPropsType` (+ re-export). Domain types live in feature `types.ts` files.
- Why it matters: Don’t expect a central GraphQL/DTO types package under `src/types`.
