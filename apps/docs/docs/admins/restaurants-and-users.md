# Restaurants & users

## Restaurant management

The **Admin → Restaurants** page lists all venues with filters by status.

### Actions

| Action | Who | Notes |
|---|---|---|
| Create | Admin | Manual onboarding |
| Edit | Admin | Profile, plan, status override |
| Approve / reject | Admin | Moves `pending` → `approved` or `rejected` |
| Suspend | Admin | Hides from search; blocks new bookings |
| Delete (permanent) | Super admin only | Irreversible |
| Import MHTML | Admin | Parse DoorDash/Uber Eats export for menu/metadata |

### Restaurant status

| Status | Effect |
|---|---|
| `pending` | Not visible to diners |
| `approved` | Live in search and booking |
| `rejected` | Registration denied |
| `suspended` | Temporarily disabled |

## User management

**Admin → Users** provides search and edit:

| Field | Notes |
|---|---|
| Role | `diner`, `restaurant_owner`, `staff`, `admin`, `super_admin` |
| Restaurant IDs | Which venues an owner/staff member can access |
| Verification | Email/phone verified flags |
| Loyalty | Platform points and tier (diners) |

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

Owners with several restaurants see a selector in `DashShell`. Admin can attach additional `restaurantIds` to their user record.

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
