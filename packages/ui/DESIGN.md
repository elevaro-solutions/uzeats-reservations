# ReserveTable Design System

A warm, modern design language for hospitality SaaS — diner web, partner dashboard, and mobile. Source of truth:

- `src/tokens.ts` — framework-agnostic design tokens
- `src/theme.ts` — shared Ant Design theme
- `src/*.tsx` — reusable components

## Principles

1. **Content first.** Restaurants, food photos, and availability are the heroes. Chrome stays quiet.
2. **One accent, used sparingly.** Brand terracotta (`#c4472f`) marks primary actions and availability. Everything else is warm stone neutrals.
3. **Soft depth over borders.** Prefer subtle layered shadows and surface contrast to heavy outlines.
4. **Consistent rhythm.** Spacing on a 4px grid; radii from the `radii` scale; type from the type scale. Import tokens — never hardcode brand hexes.
5. **Easy by default.** Guest flows show only what guests need; signed-in flows surface account tools without clutter.

## Tokens

### Color

| Token | Value | Use |
|---|---|---|
| `colors.brand[600]` | `#c4472f` | Primary actions, links, selected states |
| `colors.brand[50]` | `#fdf6f4` | Selected/hover backgrounds, icon chips |
| `colors.background` | `#f7f5f2` | App background (warm stone) |
| `colors.surface` | `#ffffff` | Cards, headers, sidebars |
| `colors.heroMid` | `#2a1816` | Hero / auth panel midtone |
| `colors.textPrimary` | `#1a1816` | Headings, body |
| `colors.textSecondary` | `#5a554d` | Supporting text |
| `colors.textTertiary` | `#a39e94` | Hints, placeholders, meta |
| `colors.border` / `bordersubtle` | `#e3dfd8` / `#f0ede8` | Dividers |
| `colors.rating` | `#e8a317` | Star ratings only |
| `colors.success/warning/error/info` | — | Statuses only, each with a `*Bg` pair |

### Typography

Plus Jakarta Sans (loaded via `next/font` as `--font-sans`), falling back to the system stack.

| Step | Size | Use |
|---|---|---|
| `display` | 40px | Hero headlines |
| `xxl` / `xl` | 30 / 24px | Page titles |
| `lg` / `md` | 20 / 16px | Section titles, card titles |
| `base` | 14px | Body (antd default) |
| `sm` / `xs` | 13 / 12px | Meta, labels, tags |

Weights: 400 body, 500 labels, 600 buttons/emphasis, 700 logos. Tighten letter-spacing on titles.

### Spacing, radius, elevation

- Spacing: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`
- Radius: `8` / `12` / `16` / `24` / `999` (pill)
- Shadows: `shadows.xs`–`lg`. `shadows.brand` for primary CTAs.

## Usage rules

- Wrap every app in `ConfigProvider theme={theme}`.
- Import tokens: `import { colors, spacing, radii } from '@reservations/ui'`.
- One `type="primary"` button per view section.
- Status → `StatusTag`; titles → `PageHeader`; empty lists → `EmptyState`.
