# Data model

MongoDB collections are defined as Mongoose models in `apps/api/src/models/`.

## Core entities

### User

Central identity for all roles.

| Field | Notes |
|---|---|
| `role` | `diner`, `restaurant_owner`, `staff`, `admin`, `super_admin` |
| `restaurantIds` | Venues an owner/staff member can access |
| `loyaltyPoints` | Platform loyalty balance |
| `notificationPreferences` | Per-event channel toggles |
| `referralCode` | Unique code for referral program |

### Restaurant

| Field | Notes |
|---|---|
| `slug` | URL identifier (`/restaurants/{slug}`, `/r/{slug}`) |
| `status` | `pending`, `approved`, `rejected`, `suspended` |
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
| `Review` | Post-visit ratings and text |
| `GiftCard` / promo codes | Stored value and discounts |
| `SupportTicket` | Platform support queue |
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

Menu and restaurant photos store a Spaces key on the document; clients upload via presigned URL from the API uploads route.

## Seed data

`apps/api/src/seed.ts` and `services/seedData.ts` populate demo restaurants, tables, shifts, and users for local development.
