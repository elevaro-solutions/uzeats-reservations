# Staff overview

The **partner dashboard** (local: http://localhost:3001) is where restaurant owners and staff manage day-to-day operations.

## Roles

| Role | Access |
|---|---|
| `restaurant_owner` | Full venue control including billing, plan changes, staff invites, and settings |
| `staff` | Operate reservations, floor plan, and guest comms — **cannot** add restaurants or manage billing |

Platform roles (`admin`, `super_admin`) see additional admin sections — see [Platform admins](/admins/platform-overview).

## Logging in

- Email/password at `/login`
- Google OAuth (when configured)
- Demo owner: `owner@tablevera.local` / `Password123!`

Owners with **multiple restaurants** use the restaurant selector in the top navigation.

## Dashboard sections (staff & owners)

| Section | Purpose |
|---|---|
| **Reservations** | Calendar and list of bookings; create phone/walk-in reservations |
| **Floor plan** | Visual table layout; assign and seat guests |
| **Waitlist** | Manage waiting parties and notify on openings |
| **Messages** | Guest conversations tied to reservations |
| **Campaigns** | Marketing campaigns to past guests (owner) |
| **Reports** | Covers, revenue, and utilization metrics |
| **Private dining** | Large-party and event inquiries |
| **Packages** | Occasion add-ons diners select at booking |
| **Settings** | Restaurant profile, menu, hours, blackouts, access rules |
| **Booking widget** | Copy embed code for your website |
| **Notifications** | Channel preferences for operational alerts |

## Owner-only areas

These require `restaurant_owner` or platform admin:

- Billing and subscription plan changes
- Adding new restaurant locations
- Staff user management
- Email template branding
- Integrations and API keys

## Onboarding checklist

New partners see an onboarding checklist in the shell tracking setup steps:

- Complete restaurant profile
- Configure shifts and tables
- Upload photos and menu
- Connect Stripe for deposits/billing
- Copy widget embed code

Progress is computed in `apps/dashboard/src/lib/onboarding.ts`.

## Getting help

- In-dashboard support tickets (when enabled)
- Platform admin support queue for escalations
- Documentation: [Daily operations](/staff/daily-operations)

## Demo tips

Set `NEXT_PUBLIC_SHOW_DEV_CREDENTIALS=true` in dashboard env to show seed login hints on `/login`.
