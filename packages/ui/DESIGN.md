# ReserveTable Design System

A minimal, modern design language for all ReserveTable surfaces (diner web, partner dashboard, mobile). The source of truth lives in this package:

- `src/tokens.ts` — framework-agnostic design tokens (colors, type, spacing, radii, shadows, layout)
- `src/theme.ts` — the shared Ant Design theme built from those tokens
- `src/*.tsx` — reusable components

## Principles

1. **Content first.** The food, restaurants, and availability are the heroes. Chrome stays quiet: white surfaces, warm-gray backgrounds, one accent color.
2. **One red, used sparingly.** Brand red (`#da3743`) marks primary actions and availability. Everything else is neutral.
3. **Soft depth over borders.** Prefer subtle layered shadows and background contrast to heavy outlines.
4. **Consistent rhythm.** All spacing on a 4px grid; radii from the `radii` scale; type from the type scale. No magic numbers.

## Tokens

### Color

| Token | Value | Use |
|---|---|---|
| `colors.brand[600]` | `#da3743` | Primary actions, links, selected states |
| `colors.brand[50]` | `#fef2f3` | Selected/hover backgrounds, icon chips |
| `colors.background` | `#f8f7f6` | App background (warm gray) |
| `colors.surface` | `#ffffff` | Cards, headers, sidebars |
| `colors.textPrimary` | `#1c1917` | Headings, body |
| `colors.textSecondary` | `#5c554e` | Supporting text |
| `colors.textTertiary` | `#a8a29c` | Hints, placeholders, meta |
| `colors.border` / `bordersubtle` | `#e5e2df` / `#f1efed` | Dividers |
| `colors.success/warning/error/info` | — | Statuses only, each with a `*Bg` pair |

Full 50–900 ramps exist for `brand` and `neutral` when in-between shades are needed.

### Typography

Inter (loaded via `next/font`, exposed as `--font-sans`), falling back to the system stack.

| Step | Size | Use |
|---|---|---|
| `display` | 38px | Hero headlines |
| `xxl` / `xl` | 30 / 24px | Page titles, stat values |
| `lg` / `md` | 20 / 16px | Section titles, card titles |
| `base` | 14px | Body (antd default) |
| `sm` / `xs` | 13 / 12px | Meta, labels, tags |

Weights: 400 body, 500 buttons, 600 emphasis, 700 numbers/logos. Tighten letter-spacing (`-0.02em`) on titles.

### Spacing, radius, elevation

- Spacing: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64` (`spacing.xxs`–`xxxl`)
- Radius: `8` controls · `10` inputs/modals · `14` cards · `20` hero panels · `999` pills
- Shadows: `shadows.xs`–`lg` (layered, low-contrast). `shadows.brand` for red CTAs that need pop.

## Components

From `@reservations/ui`:

| Component | Purpose |
|---|---|
| `RestaurantCard` | Search-result card: photo, cuisine pill overlay, rating, bookable time slots |
| `SlotPicker` | Time-slot grid with selected/unavailable/"2 left" urgency states |
| `StatusTag` | Pill with status dot for reservation/waitlist/approval states |
| `PageHeader` | Page title + subtitle + right-aligned actions |
| `EmptyState` | Friendly no-results block with icon and optional CTA |
| `StatCard` | Dashboard metric: label, big value, trend hint, icon chip |

## Usage rules

- Wrap every app in `ConfigProvider theme={theme}` (already done in each app's `Providers`).
- Import tokens instead of hardcoding: `import { colors, spacing, radii } from '@reservations/ui'`.
- Buttons: one `type="primary"` per view section; secondary actions use default or `text`.
- Status display always goes through `StatusTag`; page titles through `PageHeader`; empty lists through `EmptyState`.
- Mobile (Expo) can't use antd — import from `@reservations/ui/tokens` directly for colors/spacing parity.
