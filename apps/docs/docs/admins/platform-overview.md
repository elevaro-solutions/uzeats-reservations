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
| Edit legal agreements | ❌ | ❌ | ✅ |
| Assign the QA role | ❌ | ❌ | ✅ |

The **`qa`** role is for release testers. QA users land on the QA dashboard, can open the checklist and issues, and cannot create restaurants.

## Admin navigation

The sidebar keeps support queues first, then accounts. Billing and platform tools open from hubs (still findable with ⌘K). Hub cards can be **pinned to the sidebar**; pins are saved per user. The app version under the sidebar opens the release notes.

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
| **Platform accounts** | Every platform role (admin, account manager, super admin, QA) |
| **Billing** | Hub: invoices, failed charges, no-show fees, revenue, churn, loyalty, plans, services |
| **Platform** | Hub grouped into Setup, Configuration, Content, Email, Monitoring, QA, and Advanced (config, data exports, discovery, blog, agreements, docs access, templates, SLA, audit, developer, QA tools) |

## Legal agreements

`/admin/agreements` (Platform → Content) is the super admin editor for the **Terms of Use** (diners) and the **Restaurant Partner Agreement** (owners). Saving new content publishes a new version:

- Signers type their full legal name or draw a signature; each signature stores the version, time, IP address, and device
- Owners get 7 days to re-sign a new Partner Agreement, with reminder emails 1–2 days before the window ends
- **Preview signing page** opens the owner signing page with signing disabled
- Agreements and signed copies download as branded A4 PDFs

## QA tools

Release testing lives under Platform → QA (QA-role users get a dedicated menu):

| Page | Purpose |
|---|---|
| `/admin/qa/dashboard` | Run counts, required progress, recent sign-offs |
| `/admin/qa` | The active release checklist. Steps, notes, and sign-off are saved in the database |
| `/admin/qa/history` | Every prior run with its tasks, notes, and sign-off |
| `/admin/qa/issues` | File and track bugs and features; export as PDF, Excel, or Word |
| `/admin/qa/versions`, `/admin/qa/guide` | Release notes and how to test |

## Restaurant lifecycle

1. Partner self-registers or admin creates a restaurant
2. Status starts as `pending`
3. Admin reviews and sets `approved`, `rejected`, or `suspended` (Standing)
4. Approved restaurants that are **Visible** and **Active** (Listing) appear in diner search

See [Restaurants & users](/admins/restaurants-and-users) for Standing vs Listing.

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
