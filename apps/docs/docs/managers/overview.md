# Managers overview

The **partner dashboard** (local: http://localhost:3001) is where restaurant owners and managers manage day-to-day operations.

## Roles

| Role | Access |
|---|---|
| `restaurant_owner` | Full venue control including billing, plan changes, manager invites (Settings → Team; seats from package), and settings |
| `manager` | Operate reservations, Live floor, and guest comms — **cannot** add restaurants, manage billing, or invite managers |

Platform roles (`admin`, `super_admin`) see additional admin sections — see [Platform admins](/admins/platform-overview).

## Logging in

- Email/password at `/login`
- Google OAuth (when configured)
- Demo owner: `owner@tablevera.local` / `Password123!`

Owners with **multiple restaurants** use the restaurant selector in the top navigation. Press **⌘K** / **Ctrl+K** to search pages, settings tools, and switch restaurants.

## Dashboard layout

The Restaurant Dashboard is a **fixed operational layout**. Partners cannot add, remove, or rearrange widgets on Overview. Coverage, today’s bookings, and setup alerts are the intended cards; extra tools live on their own pages (Reservations, Floor, Messages, Settings, and so on).

## Dashboard sections (managers & owners)

Daily work stays in the sidebar. Less frequent tools live under hubs (still findable with ⌘K).

| Section | Purpose |
|---|---|
| **Reservations** | List with status and date presets; dedicated booking detail; create phone/walk-in reservations |
| **Waitlist** | Manage waiting parties and notify on openings |
| **Live floor** | Live seating: per-area grids, assign and seat guests |
| **Guests** | Per-venue CRM list with VIP status and tags; Excel/PDF export. **Loyalty** opens from a card on this page |
| **Reviews** | Guest ratings and comments; sidebar badge for unreplied reviews; new-review notifications |
| **Messages** | Guest conversations tied to reservations |
| **Grow** | Hub for marketing, public profile, booking widget, campaigns, experiences, packages, private dining |
| **Insights** | Hub for analytics and reports |
| **Settings** | Restaurant profile, **Team** (invite managers within package seats), plus setup tools (menu, blackouts, access rules, table layout, tables & shifts, notifications, …) |
| **Support** | Open a ticket with Tablevera about billing, settings, or the dashboard |

### Setup tools (Settings hub)

| Tool | Purpose |
|---|---|
| **Table layout** | Visual table layout with rotation and a resizable canvas |
| **Tables & shifts** | Table inventory and hours; add/edit in modals; searchable floor areas |
| **Menu / Blackouts / Access rules / …** | Less frequent venue configuration |

## Owner-only areas

These require `restaurant_owner` or platform admin:

- Billing and subscription plan changes
- Adding new restaurant locations
- Manager user management
- Email template branding
- Integrations and API keys

## Onboarding checklist

New partners see an onboarding checklist in the shell tracking setup steps:

- Complete restaurant profile
- Configure shifts and tables
- Upload logo, photos, and menu
- Connect Stripe for deposits/billing
- Copy widget embed code

Progress is computed in `apps/dashboard/src/lib/onboarding.ts`.

## Getting help

- **Support** in the sidebar (or the profile menu) — owners and managers can open a tracked ticket
- Platform admin **Tickets** queue for escalations
- Documentation: [Daily operations](/managers/daily-operations)

## Demo tips

Set `NEXT_PUBLIC_SHOW_DEV_CREDENTIALS=true` in dashboard env to show seed login hints on `/login`.
