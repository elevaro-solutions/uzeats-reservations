# Changelog

All notable changes to Tablevera are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.20.0] — 2026-08-12

### Added

- Partner settings toggles to accept online reservations and show or hide the public booking widget
- Public restaurant page contact-to-reserve card when the booking widget is hidden (call, website, or message)

### Changed

- Online reservation and waitlist creation are blocked when a restaurant has disabled online reservations

## [0.19.0] — 2026-08-06

### Added

- Restaurant bookmarks/saved feature with `RestaurantBookmark` model and diner `/saved` page
- Restaurant inquiry system: `RestaurantInquiry` model and contact forms on restaurant pages
- Email branding service for customizable restaurant email templates
- Enhanced restaurant detail page with modular sections: photo gallery, reviews, FAQ, terms, about, featured-in, and menu
- `RestaurantMessageModal` and `ReservationConfirmModal` for improved booking UX
- Dashboard restaurant profile page (`/profile`) with `RestaurantProfileFields` component
- Individual reservation detail page at `/reservations/[id]`
- `useUrlListFilters` hook for dashboard list filtering
- Calendar utilities (`calendar.ts`) and restaurant terms/links helpers

### Changed

- `SlotPicker` component expanded with richer date/time selection and availability display
- Dashboard messages page redesigned with enhanced inquiry handling
- Restaurant detail page refactored into composable section components
- `useActiveRestaurant` hook improved for multi-restaurant profile management
- GraphQL schema extended with bookmark and inquiry types, queries, and mutations

## [0.18.0] — 2026-08-04

### Added

- Booking draft persistence: unauthenticated users save reservation form state in session and resume after login
- Welcome-back banner when returning to complete a booking after sign-in
- `isSafeInternalPath` helper to validate post-auth redirect targets

### Changed

- MongoDB Docker port mapped to `27018` locally to avoid conflicts with system MongoDB
- Login page validates `next` redirect param against open-redirect patterns

### Fixed

- Selected table no longer cleared on initial page load when slot/party haven't changed

## [0.17.0] — 2026-08-03

### Added

- Discovery SEO landing pages: full-bleed hero, highlight chips, geolocation search, and date presets
- `NEXT_PUBLIC_SHOW_DEV_CREDENTIALS` env flag to show seed login hints on dashboard `/login`

### Changed

- Sticky discovery filters use CSS `position: sticky` instead of JS fixed pinning
- Discovery landing and city/cuisine/neighborhood/occasion pages render full-width in AppShell
- Dashboard notifications refetch after mark-read; partner restaurant list refreshes on window focus
- Waitlist and reservations tables: tighter column widths and consistent card padding

### Fixed

- Unread notification count and mark-read when `readAt` field is missing on legacy documents
- Floor page `createTable` / `createShift` GraphQL variable name (`restaurantId`)
- Floor plan table resize max bounds and drag snap direction on negative deltas

## [0.16.0] — 2026-07-31

### Added

- Multi-step admin restaurant creation wizard (owner, details, location, review)
- Inline owner account creation via `ownerInput` on `adminCreateRestaurant`
- `CuisineSelect` component with custom cuisine entry
- Direct authenticated upload endpoint (`POST /api/uploads`) for DO Spaces
- Per-app env-var catalog (API, web, dashboard) with values on Developer page

### Changed

- Developer page filters by app, requirement, status, and group; shows configured values
- Photo uploads use API proxy when presigned Spaces URLs are unavailable
- Admin support ticket page and menu page photo upload integration

## [0.15.1] — 2026-07-31

### Added

- Cursor git-push skill for automated commit workflow (docs, version bump, commit, push)

### Changed

- Root `package.json` now tracks project version (`version` field)

## [0.15.0] — 2026-07-30

### Added

- Infinite-scroll restaurant search (`useInfiniteRestaurantSearch` + intersection sentinel)
- `DiscoveryCardsLayout` with sticky desktop filters and mobile filters drawer
- Shared discovery layout components reused on homepage and SEO landing pages

### Changed

- Homepage cards view redesigned: split layout, filter toolbar, paginated load-more
- Map view filters available in a mobile drawer; map/list layouts share filter state
- Discovery landing pages align with the new cards layout and scroll behavior

## [0.14.0] — 2026-07-29

### Added

- GDPR-style **cookie consent** banner with essential/analytics/marketing preferences and `/cookies` policy
- Rewritten **Privacy** and **Terms** pages with shared `LegalPageLayout` and table of contents
- Contact form API (`submitContactForm`) with email notifications and optional Elevaro leads ingest
- Super-admin **Developer** page (`/admin/developer`) — release version and env-var health checklist
- `developerInfo` GraphQL query and shared `ENV_VAR_DEFINITIONS` catalog (values never exposed)
- `useRequireSuperAdmin` hook for super-admin-only dashboard routes

### Changed

- Contact page submits via GraphQL instead of mailto-only
- Admin restaurants table uses dropdown actions (approve/reject/suspend/edit/delete)
- Sitemap includes `/cookies`; footer links to legal pages and cookie settings

### Docs

- `.env.example` documents Elevaro leads API vars; deploy guide mentions developer env checklist

## [0.13.0] — 2026-07-29

### Added

- SEO landing pages: `/cities/:slug`, `/neighborhoods/:slug`, `/cuisine/:slug`, `/occasion/:slug`
- `sitemap.xml` and `robots.txt` with discovery index URLs
- JSON-LD breadcrumbs/FAQ helpers and `DiscoveryLandingView` shared layout
- Restaurant discovery metadata: occasions, dining styles, meals, dietary tags, amenities, neighborhood
- Expanded `searchRestaurants` filters (multi-cuisine, category chips, min rating, wheelchair, availability)
- `discoveryIndex` GraphQL query and `discoverySearch` service
- `packages/shared/discovery.ts` — slug helpers and landing-page meta builders

### Changed

- Homepage and map filters use unified `useDiscoveryFilters` with richer sidebar facets
- Seed restaurants populate discovery tags and neighborhoods for demo search
- Restaurant detail pages include SEO metadata; address autocomplete supports neighborhoods

### Docs

- README and deploy guide note `NEXT_PUBLIC_SITE_URL` for sitemap/canonical URLs

## [0.12.0] — 2026-07-29

### Added

- Diner homepage **map view** (`?view=map`) with Google Maps markers, filters sidebar, and list/map toggle
- Discovery quick-filter categories (cuisine and experience chips) in `@reservations/shared`
- Contact page (`/contact`) with topic routing to support, privacy, and legal emails
- `loadGoogleMaps` Map/Marker APIs in `@reservations/ui` for embedded discovery maps
- New cuisines: Pizza, Sushi, Tapas, Brunch

### Changed

- Homepage search redesigned with split list/map layouts, price/rating/accessibility filters on map
- Restaurant search query returns `location { lat, lng }` for map pins
- `RestaurantCard` and Places loader support map discovery UX

### Docs

- README notes map discovery and Maps API requirement for map view

## [0.11.0] — 2026-07-28

### Added

- `super_admin` role with elevated permissions (user/restaurant delete, seed wipe, role assignment guards)
- Shared role helpers (`isPlatformAdmin`, `canEditUser`, `assertCanAssignRole`) in `@reservations/shared`
- Admin restaurant create flow, expanded edit (owner, plan, widget theme, ops flags), and team assignment UI
- `adminDeleteRestaurant` and `adminCreateRestaurant` GraphQL mutations
- `hasSuperAdmin` flag on admin user list; restaurant `subscription` on admin queries

### Changed

- Platform admin access includes `admin` and `super_admin`; destructive ops require `super_admin`
- Seed creates/upgrades demo account to super admin; `clearSeedData` preserves both admin roles
- Admin users page hides delete/edit actions for super admins unless actor is super admin
- Impersonation allowed for platform admins (not only legacy `admin` role)

### Docs

- README demo account table and deploy notes updated for super admin role

## [0.10.0] — 2026-07-28

### Added

- Partner dashboard forgot/reset password flows (`/forgot-password`, `/reset-password`)
- SendGrid email delivery (`SENDGRID_API_KEY`) with Resend as fallback
- Password reset emails rendered from the `password_reset` email template (HTML + text)
- `requestPasswordReset` `app` argument routes links to diner web or partner dashboard
- API E2E tests for password reset request and token validation

### Changed

- Reset links use `WEB_APP_URL` / `DASHBOARD_APP_URL`; partners default to dashboard by role
- Pricing page Sign in / Get started point to the partner dashboard
- `sendEmail` supports HTML bodies; admin-initiated resets use the same template

### Docs

- `.env.example`, README, and deploy guide document SendGrid, app URLs, and password reset

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
