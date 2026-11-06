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
| `restaurant_owner` | Owns venue(s), billing, managers/hosts, full settings |
| `manager` | Operates venue — no billing or new restaurant creation |
| `host` | Front-of-house — reservations (today default), waitlist, live floor, guests, messages, deposits; no settings/billing/grow |
| `admin` | Platform operator — most admin pages |
| `account_manager` | Platform operator (limited elevated admin edits) |
| `super_admin` | Full platform control including destructive ops, legal agreements, QA role assignment |
| `qa` | Release tester — QA dashboard, checklist, and issues; cannot create restaurants |

## Permission helpers

Defined in `packages/shared/src/roles.ts`:

```typescript
isPlatformAdmin(role)      // admin | account_manager | super_admin
isSuperAdmin(role)         // super_admin only
canManageQaChecklist(role) // super_admin | qa
isHostRole(role)           // host
isVenueStaffRole(role)     // manager | host (consume team seats)
canManageBilling(role)     // restaurant_owner | platform admin
canCreateRestaurant(role)  // not manager/host/qa
canAccessPartnerPath(role, pathname) // host FOH allowlist
partnerLandingPath(role)   // qa → /admin/qa/dashboard; admin → /admin; host → /reservations; else /overview
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

## Docs site access

The docs site is a static build, so access is enforced by its nginx container, not by React:

1. A visitor enters a work email at `/access/`. Approved emails (from Partner Hub → Platform → **Docs access**) and platform admin accounts get a 6-digit code by email
2. `verifyDocsAccessOtp` sets the HttpOnly `tv_docs_access` cookie (30 days, `.tablevera.online`)
3. nginx calls `GET /docs-access/verify` for each page and asset (successful checks cached 5 seconds per cookie; denials not cached). The API answers 204 if the JWT is valid and the email is still approved, otherwise 401

Each code allows 5 wrong guesses, counted before the code is compared so batched or aliased GraphQL guesses cannot get around the cap. Revoking an email blocks it within a minute.

## Security notes

- Never log JWT secrets or Stripe keys
- Developer page masks secret env values
- Password minimum enforced at registration
- Login, signup, OTP, password reset, invite, gift card, and docs-access operations share a stricter limit (30 requests per 15 minutes per IP); other GraphQL calls allow 300 per minute
- Signed agreements store version, time, IP address, and device
