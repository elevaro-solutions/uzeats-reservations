# Auth & roles

## Authentication methods

| Method | Clients | Implementation |
|---|---|---|
| Email + password | Web, dashboard | bcrypt hash, JWT cookies |
| Google OAuth | Web, dashboard | ID token verified against `GOOGLE_CLIENT_ID` |
| Phone OTP | Web, mobile | Twilio Verify (dev bypass with `AUTH_DEV_OTP`) |
| Password reset | Web, dashboard | Email link to `WEB_APP_URL` or `DASHBOARD_APP_URL` |

## Token model

- **Access token** — short-lived (default 15m), HttpOnly cookie
- **Refresh token** — long-lived (default 7d), HttpOnly cookie, rotation on use
- Secrets: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`

Mobile stores tokens from the `AuthPayload` mutation response.

## Role matrix

| Role | Description |
|---|---|
| `diner` | Guest — book, review, loyalty |
| `restaurant_owner` | Owns venue(s), billing, staff, full settings |
| `staff` | Operates venue — no billing or new restaurant creation |
| `admin` | Platform operator — most admin pages |
| `super_admin` | Full platform control including destructive ops |

## Permission helpers

Defined in `packages/shared/src/roles.ts`:

```typescript
isPlatformAdmin(role)      // admin | super_admin
isSuperAdmin(role)         // super_admin only
canManageBilling(role)     // restaurant_owner | platform admin
canCreateRestaurant(role)  // owner | platform admin
canEditUser(actor, target) // super_admin guard for elevated users
```

Use the same helpers in API services and dashboard UI to stay consistent.

## GraphQL authorization

Resolvers check:

1. Is the user authenticated?
2. Does their role permit this operation?
3. Do they own the restaurant (`restaurantIds` contains target)?

Platform admin mutations additionally call `assertCanEditUser` for user management.

## Integration auth

Partner API integrations use keys validated in `apps/api/src/middleware/integrationAuth.ts`.

## Session in Next.js apps

Both web and dashboard use Apollo Client with `credentials: 'include'`. Auth state is loaded via a `me` query on app init (`useAuth` hook in dashboard).

## CORS

API accepts origins listed in `CORS_ORIGINS` (comma-separated). Must include web and dashboard URLs in each environment.

## Security notes

- Never log JWT secrets or Stripe keys
- Developer page masks secret env values
- Password minimum enforced at registration
- Rate limiting on auth endpoints (where configured)
