# Assets — Learnings & Observations

## [2026-09-14] Hand-rolled Lucide icons, not an icon package
- Icons are local path components under `assets/icons/icons/*.icon.tsx`, wrapped by `SvgWrapper` (`filled` flips fill/stroke). Each new icon needs a file plus an export in `assets/icons/index.ts`. Tab icons pass `filled={focused}`; `HeartIcon` uses `filled` for favorites.
- Why it matters: Don’t install lucide-react-native expecting parity — the set is curated and manually exported.

## [2026-09-14] Dining-style icons live under discovery
- Decorative dining-style / bento icons sit in `features/discovery/icons/`, not `assets/`.
- Why it matters: Not every “icon-shaped” asset belongs in `assets/`; discovery owns those decorative icons.
