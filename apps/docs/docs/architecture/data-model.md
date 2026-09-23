# Data model

MongoDB collections are defined as Mongoose models in `apps/api/src/models/`.

## Core entities

### User

Central identity for all roles.

| Field | Notes |
|---|---|
| `role` | `diner`, `restaurant_owner`, `manager`, `admin`, `super_admin` |
| `restaurantIds` | Venues an owner/manager member can access |
| `loyaltyPoints` | Platform loyalty balance |
| `notificationPreferences` | Per-event channel toggles |
| `referralCode` | Unique code for referral program |

### Restaurant

| Field | Notes |
|---|---|
| `slug` | URL identifier (`/restaurants/{slug}`; legacy `/r/{slug}` 308s here) |
| `previousSlugs` | Former slugs kept for redirects; still reserved so another venue cannot claim them |
| `status` | `pending`, `approved`, `rejected`, `suspended` |
| `logoUrl` | Dedicated mark on diner profile pages (falls back to first gallery photo, then initials) |
| `geo` | `{ lng, lat }` for nearby search |
| `subscription` | Stripe subscription reference and plan |
| `settings` | Booking rules, deposit config, widget toggles |

### Reservation

| Field | Notes |
|---|---|
| `status` | Lifecycle: pending → confirmed → seated → completed |
| `source` | `network`, `website`, `widget`, `phone`, `walkin` |
| `tableId` | Assigned table (optional until seated) |
| `depositPaymentIntentId` | Stripe hold reference |
| `occasion` | birthday, anniversary, business, etc. |

Admins list every booking with `adminReservations` (`requireAdmin`). Partners stay on `restaurantReservations` for one venue.

### Table & Shift

- **Table** — capacity, section, floor plan coordinates
- **Shift** — service periods with start/end times and days of week
- Availability = shifts − reservations − blackouts ± access rules

### WaitlistEntry

Tracks waiting parties with `WaitlistStatus`: waiting, notified, booked, seated, expired, cancelled.

## Supporting entities

| Model | Purpose |
|---|---|
| `Experience` | Private dining / large party inquiries |
| `RestaurantPackage` | Add-ons diners select at booking |
| `Review` | Post-visit ratings (`rating` overall plus optional food/service/atmosphere), up to 3 `photos`, and `ownerReply` |
| `Menu` | Nested sections/items; `popular` flags (max 10) drive the public restaurant page |
| `GiftCard` / promo codes | Stored value and discounts |
| `SupportTicket` | Platform support queue |
| `RestaurantSlugRequest` | Owner-requested public URL slug change (`pending` / `approved` / `denied`) |
| `RestaurantProfileChangeRequest` | Partner-requested diner-facing profile change (`pending` / `approved` / `denied`) |
| `AuditLog` | Admin action history |
| `Campaign` | Partner marketing to past guests |

Index file: `apps/api/src/models/index.ts`

## Booking slot claims

Concurrent bookings are prevented by **atomic slot claims** — a unique compound index on `(restaurantId, tableId, startTime)` ensures only one reservation wins a slot. No MongoDB transaction / replica-set requirement for the common path.

See [Booking engine](/architecture/booking-engine).

## Search & discovery

Restaurant discovery combines:

- Text index on name, cuisine, description
- Geo queries for nearby
- Curated city/cuisine hub metadata in seed data and CMS-like config

Service: `apps/api/src/services/discoverySearch.ts`

## File storage

Menu, restaurant, logo, and review photos store a Spaces URL on the document; clients upload via authenticated `POST /api/uploads` then pass URLs in GraphQL (for example `createReview.photos`).

## Seed data

`apps/api/src/seed.ts` and `services/seedData.ts` populate demo restaurants, tables, shifts, and users for local development.
