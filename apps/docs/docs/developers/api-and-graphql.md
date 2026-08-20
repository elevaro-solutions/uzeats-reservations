# API & GraphQL

The backend is a single **Apollo GraphQL** server with complementary REST routes for webhooks and file uploads.

## Endpoint

- **Local:** http://localhost:4000/graphql
- **Production:** `https://api.tablevera.online/graphql`

Clients connect with Apollo Client using HttpOnly cookie sessions for browser apps and bearer tokens where needed.

## Schema overview

The schema is defined in `apps/api/src/graphql/typeDefs.ts`. Key enums:

| Enum | Values |
|---|---|
| `UserRole` | `diner`, `restaurant_owner`, `staff`, `admin`, `super_admin` |
| `ReservationStatus` | `pending`, `confirmed`, `seated`, `completed`, `cancelled`, `no_show` |
| `ReservationSource` | `network`, `website`, `widget`, `phone`, `walkin` |
| `RestaurantStatus` | `pending`, `approved`, `rejected`, `suspended` |

Major domains in the schema:

- **Auth** — register, login, Google OAuth, phone OTP, password reset
- **Restaurants** — CRUD, search/discovery, menus, photos, packages
- **Reservations** — create, modify, cancel, messaging, deposits
- **Waitlist** — join, notify, convert to booking
- **Loyalty & promotions** — points, tiers, gift cards, promo codes
- **Billing** — Stripe subscriptions, invoices, plan changes
- **Admin** — users, moderation, platform config, support tickets
- **Notifications** — inbox, preferences, push subscriptions

Resolvers live under `apps/api/src/graphql/resolvers/` and delegate to `apps/api/src/services/`.

## REST routes

| Route | Purpose |
|---|---|
| `POST /webhooks/stripe` | Payment intents, subscription events |
| `POST /webhooks/telegram` | Telegram bot updates |
| `POST /routes/uploads` | Presigned DO Spaces URLs |
| Partner registration | Self-serve restaurant signup with Stripe |

## Workers (BullMQ)

Redis-backed queues handle:

- Reservation reminders (email, SMS, push)
- No-show detection after grace period
- Waitlist / availability alert notifications

## Testing the API

```bash
pnpm --filter @reservations/api test
```

Integration tests cover loyalty, gift cards, promotion codes, plan changes, and Telegram webhooks.

## GraphQL playground

In development, open http://localhost:4000/graphql in a browser for the Apollo Sandbox / introspection query explorer.

## Authentication flow

1. Client calls `login` or `register` mutation.
2. API sets HttpOnly `accessToken` and `refreshToken` cookies.
3. Apollo Client sends cookies on subsequent requests (`credentials: 'include'`).
4. Access tokens expire in 15 minutes; refresh tokens last 7 days (configurable via env).

For mobile, tokens are returned in the mutation payload and stored in secure storage.

## Related

- [Environment variables](/developers/environment)
- [Auth & roles](/architecture/auth-and-roles)
- [Booking engine](/architecture/booking-engine)
