# Restaurants & users

## Restaurant management

The **Admin → Restaurants** page lists all venues with filters by status.

### Actions

| Action | Who | Notes |
|---|---|---|
| Create | Admin | Manual onboarding |
| Edit | Admin | Profile, plan, status override, public URL slug, logo |
| Change public URL | Admin | Edit slug on the restaurant, or approve **Admin → URL slugs** |
| Request public URL | Owner | Settings → Public URL; managers cannot request |
| Request public profile | Owner/manager | Grow → Public profile; reviewed at **Admin → Profile requests** |
| Edit menu | Admin | Restaurant detail → Menu; check **Popular** on up to 10 dishes for the public page |
| Approve / reject | Admin | Moves `pending` → `approved` or `rejected` |
| Suspend | Admin | Also marks the restaurant inactive and not visible; the public page shows a closed booking card |
| Visible / Not visible, Active / Inactive | Admin | Listing switches, only for approved restaurants |
| Package / paid period start | Super admin | Restaurant → Package; a stale Stripe subscription link is dropped instead of failing |
| Delete (permanent) | Super admin only | Irreversible |
| Import MHTML | Admin | Parse DoorDash/Uber Eats export for menu/metadata |

The More menu and bulk bar group **Standing** (Approve / Reject / Suspend) apart from **Listing** (Visible / Active). Reject, Suspend, Not visible, Active, and Inactive ask for a reason, which is stored on the audit log.

### Standing

| Status | Effect |
|---|---|
| `pending` | Not visible to diners |
| `approved` | Eligible for search and booking (see Listing) |
| `rejected` | Registration denied |
| `suspended` | Temporarily disabled; approving again makes it visible and active |

### Listing

| Setting | Effect |
|---|---|
| **Not visible** | Hidden from diner search and its public page |
| **Inactive** | Public page stays, but **Complete reservation** is disabled and new bookings are rejected; out of diner search |

A restaurant with no active plan, or one past day 14 of the unpaid-invoice ladder, is also off diner search.

### Add restaurant

**Add restaurant** walks through Details, Owner, and Review. If the new owner's email or phone is already registered, the Owner step names it so you can change it, leave the phone blank, or link the existing account. Admin-created restaurants on a free trial still need a default card (setup guide step).

### Public URL slugs

Restaurant booking pages use `/restaurants/{slug}`. Admins can edit the slug on the restaurant manage form. Owners request a change from **Settings → Public URL**; managers cannot. Review the queue at **Admin → URL slugs**.

Former slugs stay reserved and 308 to the current URL so shared links keep working.

### Public profile changes

Diner-facing about copy, photos, logo, discovery tags, FAQ, press mentions, and terms are requested from **Grow → Public profile**. They stay pending until an admin approves or denies them at **Admin → Profile requests**. Admins can still edit the live profile immediately from the restaurant Manage tab.

## User management

Account admin is split by role:

| Page | Accounts | Create |
|---|---|---|
| **Admin → Guests** | Customer accounts on the guest app | Create guest with email/password |
| **Admin → Restaurant accounts** | Owners and venue staff (`restaurant_owner` / `manager` / `host`) | Create or invite with role + venue access; staff need ≥1 venue |
| **Admin → Platform accounts** | `admin` / `account_manager` / `super_admin` / `qa` | Create admin, account manager, or QA (super admin); promote super admin via role change |

Each list has a **detail** page for profile, password reset, impersonation, and assigned restaurants (owners/managers). **Guests**, **Restaurant accounts**, and **Admins** can download the current filters as Excel, PDF, or JSON.

**Admin → Reservations** lists every booking on the platform (guest, restaurant, status, source, date). Filter by venue or guest; open a booking for the detail page (`/admin/reservations/[id]`) to view guest/visit info, update status, or **Change date & time** (pending/confirmed/seated). Row actions and the restaurant Manage → Reservations panel link to the same detail page. Per-guest history stays on the guest detail page.

| Field | Notes |
|---|---|
| Role | `diner`, `restaurant_owner`, `manager`, `host`, `admin`, `account_manager`, `super_admin`, `qa` |
| Restaurant IDs | Which venues an owner/manager member can access |
| Verification | Email/phone verified flags |
| Loyalty | Platform points and tier (guests) |

### Edit permissions

- Regular `admin` **cannot** edit or delete `super_admin` users
- Only `super_admin` can assign the `super_admin` role
- Use `canEditUser()` from `@reservations/shared` — same logic as the API

## Partner self-registration

Partners can register at the dashboard signup flow:

1. Account creation
2. Restaurant details
3. Stripe payment method for subscription
4. Pending admin approval (optional depending on config)

Registration API: `apps/api/src/routes/partner.ts` and `services/partnerRegister.ts`.

## Multi-location owners

Owners with several restaurants land on **All restaurants** and pick a venue from the header selector in `DashShell`. Admin can attach additional `restaurantIds` to their user record.

## Audit

Sensitive admin actions are logged via `apps/api/src/services/audit.ts` for compliance and debugging.

## Seed data management

Super admins can wipe demo seed data while preserving admin accounts:

```bash
pnpm seed -- --clear
```

Or re-seed fresh demo content:

```bash
pnpm seed
```
