# Platform overview

**Platform admins** operate Tablevera itself — approving restaurants, managing users, billing, support, and global configuration.

Access requires role `admin`, `account_manager`, or `super_admin` in the partner dashboard.

## Role differences

| Capability | `account_manager` | `admin` | `super_admin` |
|---|---|---|---|
| View/manage restaurants | ✅ | ✅ | ✅ |
| View reservations; change date & time | ✅ | ✅ | ✅ |
| User management | ✅ (not elevated admins) | ✅ (not super admins) | ✅ |
| Support & moderation | ✅ | ✅ | ✅ |
| Platform config & templates | ✅ | ✅ | ✅ |
| **Permanent delete** users/restaurants | ❌ | ❌ | ✅ |
| Edit platform loyalty rates and tiers | ❌ (view stats) | ❌ (view stats) | ✅ |
| Wipe seed data | ❌ | ❌ | ✅ |
| Assign admin / super admin | ❌ | ❌ | ✅ |
| Modify super admin accounts | ❌ | ❌ | ✅ |

Demo super admin: `a@tablevera.local` / `Password123!`

## Admin navigation

The sidebar keeps support queues first, then accounts. Billing and platform tools open from hubs (still findable with ⌘K).

| Page | Purpose |
|---|---|
| **Overview** | Platform KPIs and health |
| **Restaurants** | Approve, edit, suspend, delete venues |
| **Reservations** | All bookings across restaurants |
| **URL slugs** | Owner requests to change public booking URLs |
| **Profile requests** | Owner requests to change guest-facing restaurant pages |
| **Tickets** | Support ticket queue from partners |
| **Moderation** | Review flagged content |
| **Guests** | Create and manage customer accounts |
| **Restaurant accounts** | Owners and managers with venue assignment |
| **Admins** | Platform admins and account managers |
| **Billing** | Hub: invoices, revenue, churn, loyalty, plans, services, data exports |
| **Platform** | Hub: config, discovery, blog, docs access, templates, SLA, audit, developer |

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
