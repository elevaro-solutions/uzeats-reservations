# Changelog

All notable changes to Tablevera are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.9.0] — 2026-07-23

### Added

- Partner **Booking widget** page (`/booking-widget`) with shared `BookingSharePanel` for link + embed copy
- Public pricing page cover-fee breakdown (network vs website covers per plan)

### Changed

- Widget build copies `widget.js` into `apps/web/public/` automatically; web `dev`/`build` run widget build first
- Onboarding and Settings reuse `BookingSharePanel` instead of inline embed markup
- `Dockerfile.web` includes the widget package in the image build

### Docs

- Widget README documents auto-deploy to `/widget.js`; deploy guide notes widget is bundled with web builds

## [0.8.0] — 2026-07-22

### Added

- Partner onboarding checklist (`/onboarding`) with setup progress, booking link, and widget embed copy
- Short public booking URLs at `/r/:slug` (slug-based restaurant lookup on diner web)
- Shared `bookingUrl` helpers: `buildRestaurantBookingPath`, `buildRestaurantBookingUrl`, `buildWidgetEmbedCode`
- Partner overview: plan picker when adding a venue, search/filter by status and city, location metadata
- Admin restaurant list search; `myRestaurants` and `adminRestaurants` text filters
- Extracted `createRestaurantSubscription` service (used by partner register and create flows)

### Changed

- Settings shows shareable booking URL and inline/button widget embed snippets
- DashShell surfaces onboarding banner and searchable venue selector for multi-location owners
- `createRestaurant` accepts optional `plan` to start Stripe subscription on signup

### Docs

- README and deploy guide cover `NEXT_PUBLIC_WEB_URL`, short `/r/:slug` links, and partner onboarding
- Widget README notes dashboard-generated embed code

## [0.7.0] — 2026-07-22

### Added

- Platform-wide annual billing settings (scope, free months, or percent off) editable in admin pricing
- `annualBillingSettings` GraphQL query and `amount_off` plan discount type
- Shared `annualBilling` helpers for monthly vs annual price display and savings labels

### Changed

- Public pricing page redesigned with monthly/annual toggle and dynamic annual savings
- Admin pricing UI manages global annual billing and per-plan fixed-amount discounts
- `PlanPrice` component and plan pricing resolver honor annual billing overrides

## [0.6.0] — 2026-07-22

### Added

- Per-restaurant loyalty: earn/redeem, tiers, point expiry, referral codes, and partner/admin stats dashboards
- Gift cards (issue, validate, redeem at booking) and promotion codes with performance stats
- Telegram bot webhook (`/webhooks/telegram`) with long-polling fallback in dev; profile chat ID linking
- Tablevera brand assets and shared `BrandLogo` / palette system (`NEXT_PUBLIC_COLOR_PALETTE`, `EXPO_PUBLIC_COLOR_PALETTE`)
- Second color palette (Forest & Gold default; Terracotta & Amber optional) via CSS variables across web, dashboard, widget, and mobile
- Diner profile loyalty balances, referral sharing, and richer restaurant detail booking (promo + gift card at checkout)
- Partner marketing hub, loyalty settings, and admin loyalty overview
- API tests for loyalty, gift cards, promotion codes, and Telegram

### Changed

- Platform and restaurant loyalty models expanded; reservations track promo/gift-card discounts
- Admin pricing/config pages support plan discounts; billing surfaces `PlanPrice`
- Web and dashboard shells use shared brand components; mobile gets Tablevera icons and splash assets

### Docs

- `.env.example` and deploy guide document Telegram webhook env vars and palette selection

## [0.5.0] — 2026-07-20

### Changed

- Partner dashboard upgraded to Apollo Client 4, Ant Design 6, Next.js 16, and GraphQL 17 (aligned with diner web)
- Dashboard hooks moved to `@/lib/apollo-hooks` for untyped Apollo React usage under AC4
- Auth token refresh error link updated for Apollo Client 4 (`CombinedGraphQLErrors` / `HttpLink`)
- Admin users table actions consolidated into a dropdown menu

### Removed

- `@ant-design/v5-patch-for-react-19` from the dashboard (no longer needed on antd 6)

## [0.4.0] — 2026-07-20

### Added

- Platform admin hub: restaurants, users, invoices, revenue, pricing, churn, SLA, support tickets, moderation, email templates, exports, and config
- Partner self-registration (`/register`) gated by platform feature flags
- Billing invoices (generate, status updates, Stripe sync) and platform revenue reports
- Support ticket lifecycle with notes, attachments, and event history
- Shared `AddressAutocomplete` + `PhoneInput` in `@reservations/ui` (Maps key optional; plain fallback)
- Cursor pagination helpers and URL pagination hooks across dashboard/web list pages
- Staff invite and safer admin user delete (optional 2FA code)

### Changed

- Product rebranded to **Tablevera** (`tablevera.online`); seed demo emails use `@tablevera.local`
- Google Sign-In / Maps env docs clarified; web + dashboard Docker builds accept Maps API key
- Partner and admin GraphQL surfaces expanded with connection types (`items` + `total`)
- Pricing, home, auth, and shell polish on diner web; denser admin navigation in dashboard

### Docs

- README, deploy, and Dokku notes updated for Tablevera branding and new public URL env vars

## [0.3.0] — 2026-07-19

### Added

- Geo restaurant search with Google Places address autocomplete and near-me (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)
- Partner in-app notifications inbox, unread badge, and per-event channel preferences (`/notifications`)
- Owner/staff manual bookings (phone / walk-in), reservation edit, and hard delete APIs
- Diner cancel confirmation modal with required cancellation reason
- Reservation-scoped messaging (`messages` keyed by `reservationId`)

### Changed

- Search supports combined text + geo filters (regex when `$near` is active)
- Partner reservations and floor ops expanded for create/edit/seat flows
- Dashboard and diner shells gain notification dropdowns and denser account nav
- Availability / smart-assign / slot-claim edge cases tightened for concurrent booking

### Docs

- Deploy notes and `.env.example` document the Maps API key and Places requirement

## [0.2.0] — 2026-07-19

### Added

- Partner **Settings** hub (`/settings`) for restaurant profile, booking rules, widget theme, and shortcuts to menu, blackouts, access rules, surveys, groups, and integrations
- `useActiveRestaurant` hook — keeps the Partner Hub header restaurant selector in sync across pages via `localStorage` + `rt-restaurant-change`
- Restaurant selector in the dashboard shell for multi-venue owners
- Diner account dropdown (profile, reservations, waitlist, log out) and brand mark in the web shell
- Dedicated `colors.rating` and `colors.heroMid` design tokens

### Changed

- Design system refresh: terracotta brand (`#c4472f`), warm stone neutrals, Plus Jakarta Sans, softer radii
- Default booking-widget primary color aligned to the new brand
- `/edit` redirects to Settings (legacy route kept for bookmarks)
- Partner overview, menu, reservations, and related dashboard pages restyled with shared `PageHeader` / surface patterns
- Diner home, pricing, profile, reservations, waitlist, auth, and restaurant detail pages updated to the new visual language
- Shared `RestaurantCard`, `SlotPicker`, Ant Design theme, and embeddable widget styles follow the new tokens

### Docs

- README updated for packages, design system, and Settings
- `packages/ui/DESIGN.md` rewritten for the hospitality palette

## [0.1.0] — 2026-07-12

### Added

- Initial Tablevera monorepo: GraphQL API, diner web, partner dashboard, mobile, shared UI, and booking widget
- Concurrent-safe booking via atomic table slot claims (no MongoDB replica set required)
- Deposits, waitlist, loyalty, reviews, menus, notifications, and auth (email, Google, phone OTP)
