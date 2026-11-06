# Managers overview

The **partner dashboard** (local: http://localhost:3001) is where restaurant owners and managers manage day-to-day operations.

## Roles

| Role | Access |
|---|---|
| `restaurant_owner` | Full venue control including billing, plan changes, team invites (Settings → Team; seats from package), agreements, and settings |
| `manager` | Operate reservations, Live floor, and guest comms — **cannot** add restaurants, manage billing, or invite staff |
| `host` | Front of house only: reservations, waitlist, Live floor, guests, and messages. No billing, settings, or Grow |

Managers and hosts each use one team seat from the package. Platform roles (`admin`, `account_manager`, `super_admin`, `qa`) see additional admin sections — see [Platform admins](/admins/platform-overview).

## Logging in

- Email/password at `/login`
- Google OAuth (when configured)
- **Tablevera Partner** app on the App Store and Google Play (owners, managers, hosts)

A short "preparing" screen shows while the session and landing page load.

### All restaurants

Owners and managers with **more than one restaurant** land on **All restaurants**. Overview, My restaurants, Reservations, Waitlist, and Billing show every location together. The rest of the menu appears once you pick a restaurant from the header or from My restaurants. A `restaurant` id in the URL loads only that restaurant. Press **⌘K** / **Ctrl+K** to search pages, settings tools, and switch restaurants.

Alerts follow the selected restaurant: the header bell and Overview **Unread alerts** show that restaurant's alerts plus account-level ones. **All restaurants** shows every alert, and **Mark all read** only clears what you are viewing.

## Dashboard layout

The Restaurant Dashboard is a **fixed operational layout**. Partners cannot add, remove, or rearrange widgets on Overview. Coverage, today’s bookings, and setup alerts are the intended cards; extra tools live on their own pages (Reservations, Floor, Messages, Settings, and so on).

## Dashboard sections (managers & owners)

Daily work stays in the sidebar. Less frequent tools live under hubs (still findable with ⌘K).

| Section | Purpose |
|---|---|
| **Reservations** | List with status and date presets; dedicated booking detail; create phone/walk-in reservations |
| **Waitlist** | Manage waiting parties and notify on openings |
| **Live floor** | Live seating: Tables (default), Floor plan, List, and 3D views; assign and seat guests |
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

## Setup guide

New partners get a floating **Setup guide** (also the full page at `/onboarding`) grouped into listing, service, payments, team, and go live. Steps tick off as you finish them; optional steps can be skipped. Required steps include:

- Complete the restaurant profile, photos, and menu
- Configure shifts and tables
- **Choose a plan**
- **Add a default payment card** (owners / billing managers). Done once a debit or credit card is saved as the venue default. This card is auto-charged for renewals, monthly cover-fee invoices, and paid extras (SMS credits, 3D room)
- **Sign the Partner Agreement** (owners, under Go live). Shows the days left when an updated version is waiting

Progress is computed in `apps/dashboard/src/lib/onboarding.ts`.

## Partner Agreement

Owners sign the Restaurant Partner Agreement at signup by typing their full legal name or drawing a signature. Settings → Account → **Agreements** opens it any time to read, download the PDF, or download a signed copy.

When Tablevera publishes a new version, owners see a banner and have 7 days to re-sign at `/agreements/sign`. Reminder emails go out 1–2 days before the window ends. After 7 days, Partner Hub sends owners to the signing page until they sign.

## Restaurant visibility

| Setting | Effect |
|---|---|
| **Visible / Not visible** | Not visible hides the restaurant from diner search and its public page |
| **Active / Inactive** | Inactive keeps the public page but blocks new bookings |

A restaurant with no active plan, or one hidden for non-payment, is also off diner search. See [Billing & plans](/admins/billing-and-plans) for the unpaid-invoice ladder.

## Getting help

- **Support** in the sidebar (or the profile menu) — owners and managers can open a tracked ticket
- Platform admin **Tickets** queue for escalations
- Documentation: [Daily operations](/managers/daily-operations)

## Local demo

For local development, `pnpm seed` creates a demo owner (see [Getting started](/developers/getting-started)).
