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
| Wipe seed data | ❌ | ✅ |
| Modify super admin accounts | ❌ | ✅ |

Demo super admin: `admin@tablevera.local` / `Password123!`

## Admin navigation

Admin sections appear in the dashboard sidebar under **Admin**:

| Page | Purpose |
|---|---|
| **Dashboard** | Platform KPIs and health |
| **Restaurants** | Approve, edit, suspend, delete venues |
| **Users** | Search, edit roles, deactivate accounts |
| **Invoices** | Stripe invoice history |
| **Revenue** | MRR and revenue analytics |
| **Churn** | Subscription cancellation trends |
| **Support** | Ticket queue from diners and partners |
| **Moderation** | Review flagged content |
| **Blog** | Publish SEO articles |
| **Templates** | Platform email templates |
| **Config** | Global settings and feature flags |
| **Pricing** | Plan definitions and annual discounts |
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
