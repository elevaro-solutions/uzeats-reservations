# Platform overview

**Platform admins** operate Tablevera itself — approving restaurants, managing users, billing, support, and global configuration.

Access requires role `admin` or `super_admin` in the partner dashboard.

## Role differences

| Capability | `admin` | `super_admin` |
|---|---|---|
| View/manage restaurants | ✅ | ✅ |
| User management | ✅ (not super admins) | ✅ |
| Support & moderation | ✅ | ✅ |
| Platform config & templates | ✅ | ✅ |
| **Permanent delete** users/restaurants | ❌ | ✅ |
| Edit platform loyalty rates and tiers | ❌ (view stats) | ✅ |
| Wipe seed data | ❌ | ✅ |
| Modify super admin accounts | ❌ | ✅ |

Demo super admin: `a@tablevera.local` / `Password123!`

## Admin navigation

Admin sections appear in the dashboard sidebar under **Admin**:

| Page | Purpose |
|---|---|
| **Overview** | Platform KPIs and health |
| **Diners** | Create and manage customer accounts |
| **Restaurant owners** | Partner owner accounts and venue assignment |
| **Staff** | Team accounts with restaurant access |
| **Platform users** | Admin and super admin access |
| **Restaurants** | Approve, edit, suspend, delete venues |
| **Reservations** | All bookings across restaurants |
| **URL slugs** | Owner requests to change public booking URLs |
| **Public profile** | Owner requests to change diner-facing restaurant pages |
| **Invoices** | Stripe invoice history |
| **Revenue** | MRR and revenue analytics |
| **Churn** | Cancellation and downgrade trends |
| **Loyalty** | Platform points liability, diner tiers, and referral activity. Super admins edit earn rates and create tiers. |
| **Support** | Ticket queue from diners and partners |
| **Moderation** | Review flagged content |
| **Blog** | Publish SEO articles |
| **Templates** | Platform email templates |
| **Config** | Global settings and feature flags |
| **Pricing** | Plan definitions and annual discounts |
| **Data exports** | CSV / Excel / JSON / PDF downloads, including restaurant guest CRM |
| **Developer** | Env-var health checklist (secrets masked) |

## Restaurant lifecycle

1. Partner self-registers or admin creates a restaurant
2. Status starts as `pending`
3. Admin reviews and sets `approved`, `rejected`, or `suspended`
4. Approved restaurants appear in diner search

Admins can import restaurant data from DoorDash/Uber Eats MHTML files.

## Support workflow

Support tickets flow into the admin **Support** queue:

- Assign, reply, and resolve tickets
- Link tickets to users or restaurants
- Audit trail in admin logs

## Developer page

`/admin/developer` shows:

- App version (from CHANGELOG)
- Per-app env var status from `@reservations/shared` registry
- Missing required vars highlighted
- Secret values masked

Useful for verifying production deployments without SSH access.

## Next steps

- [Restaurants & users](/admins/restaurants-and-users)
- [Billing & plans](/admins/billing-and-plans)
- [Support & moderation](/admins/support-and-moderation)
