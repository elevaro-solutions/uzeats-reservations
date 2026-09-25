# Changelog

All notable changes to Tablevera are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.67.1] — 2026-09-26

### Changed

- Mobile push: soft in-app permission prompt after booking confirmation or waitlist join (OS dialog only on Allow); sign-in no longer triggers a cold OS permission dialog

## [0.67.0] — 2026-09-26

### Fixed

- Restaurant photo browser uses a uniform grid (2×2 for four photos) instead of a full-width mosaic that left uneven stacks
- Reservation dates/times are consistent across Uzbekistan vs US browsers: pickers, partner create/edit, emails/waitlist, discovery, and API day bounds use restaurant (or platform ET) calendar — not browser/UTC day
- Guest booking resume after sign-in no longer false-flags the chosen slot as unavailable (ISO time equality + empty-slots guard + network-only availability + submit lock)
- Existing-account registration shows a clear “already registered” message on diner web and mobile
- Admin “View as” for diners opens the public diner app (with web cookie + exit banner) instead of Partner Hub
- Admin restaurants list “View as diner” opens the public booking page (Manage is a separate action)

### Added

- Live floor / Table layout edit panel: Require manual approval toggle for existing tables
- Admin guest (diner) detail tabs: Reservations, Reviews, Points history, Notification settings
- `adminUserReviews` and `adminUserLoyalty` GraphQL queries

## [0.66.1] — 2026-09-25

### Fixed

- Elevaro Telegram Open button links to `/reservations/{id}` (detail) instead of `/reservations?id=` (list ignored the query)

## [0.66.0] — 2026-09-25

### Changed

- Elevaro Telegram reservation alerts send platform-owned copy (email, full name, table, phone, special request, time, guests) instead of the bot's short template

## [0.65.1] — 2026-09-24

### Fixed

- In-app inbox for unmapped notification types (`reservation_needs_approval`, `reservation_pending_approval`, `restaurant_inquiry`, `staff_invite`) — they no longer skip Platform/in-app via the password-reset fallback
- Email without `SENDGRID_API_KEY` is recorded as failed (no silent stub `sent`); seed `.local` / `.test` addresses are refused before hitting SendGrid

## [0.65.0] — 2026-09-24

### Fixed

- Diner restaurant Details **Reservations** row uses `formatBookingHours` (per-shift start–end windows) instead of `formatShortHours`, which collapsed lunch+dinner into one misleading span
- Desktop sticky booking card scrolls inside the viewport when the form is taller than the screen, so **Complete reservation** is reachable without scrolling to the page footer
- Stripe deposit release cancels uncaptured PaymentIntents (`requires_capture`) instead of calling `refunds.create`, which fails on holds

### Changed

- Diner `/reservations` list: more-actions (⋯) menu sits in the card top-right next to the status badge (still hidden ≤640px so tap opens detail)
- Partner Experiences create/edit modal: TimePickers for start/end on one row, min + max guests with ticket price, Cover photo label, tighter vertical spacing; single-photo upload shows dropzone and preview side-by-side with `overflow-x` hidden; sticky footer with Cancel | Create/Save; header matches reference (icon + title, full-width rule, aligned close)
- Deposit refund/release confirmations require a reason (presets + optional details) via shared `RefundDepositModal`

### Added

- Experience `minGuests` (defaults to 1 for existing records); enforced on create/update and diner booking party size
- Diner restaurant profile: **Private dining** content section + nav tab (shown only when active spaces exist); **Experiences** tab remains conditional on upcoming published experiences
- Partner and admin reservations lists show a **Deposit** column (amount + status)
- `refundReservationDeposit` GraphQL mutation for partners/admins to release authorized holds or refund captured deposits; actions on list menus, reservation detail pages, and floor-ops drawer
- Partial refunds for captured deposits (`amountCents`); tracks `depositRefundedCents` / `depositRefundableCents`; holds remain full-release only
- Stripe webhook sync for `payment_intent.canceled` and `charge.refunded` → `syncDepositRefundedFromStripe` (keeps DB aligned with Dashboard refunds; charge events pass cumulative `amount_refunded`)
- `deposit_refunded` notification type maps to diner `reservationUpdates` preferences
- API tests for deposit refund authorization, partial refunds, status rules, and webhook sync idempotency

## [0.64.0] — 2026-09-24

### Fixed

- Partner `/reservations` deep-link open no longer throws `setRestaurantId is not defined` when switching to the reservation’s restaurant
- Mark `@reservations/ui` `RestaurantCard` with `'use client'` so Next.js App Router can import its hooks (`useEffect`/`useState`) without a Server Components build error

### Added

- Admin Email templates: **Send test** per template (recipient defaults to the signed-in admin email; uses current editor draft + sample vars; subject prefixed `[Test]`)
- Renamed email template label `Restaurant created — onboarding & invoice` → `Restaurant created` (list buttons wrap long names)
- Partner `/reservations` custom filter is an inclusive date range (`startDate`/`endDate`) with Excel, PDF, and JSON export via `exportRestaurantReservations`
- Partner `/reservations` defaults to **Upcoming**, and multi-location accounts can filter **All locations** (`locations=all`)
- Google Business Profile booking links include UTM params (`utm_source=google`, `utm_medium=business_profile`, `utm_campaign=reservations`) via `BookingSharePanel` and `buildGoogleBusinessProfileBookingUrl`
- Embeddable widget booking redirects include UTM params (`utm_source=widget`, `utm_medium=embed`, `utm_campaign=reservations`) via `WIDGET_EMBED_UTM`
- Redis short-TTL cache for availability (`avail:v1:*`, 45s) plus shared Redis client for `/health`
- Home page SSR seeds the default discovery search; discovery cards / map list / marker use `next/image` when the CDN host is allowlisted
- Widget bootstrap query loads restaurant + availability in one GraphQL round-trip

### Changed

- Hero discovery search fields use a stronger fill (`#efece7`), border, and secondary labels so stacked mobile/tablet cells and the desktop bar read clearly against the white card
- Restaurant hero gallery mirrors OpenTable: flush mosaic (2 / 3 / 5 slots), centered **See all N photos** CTA, white scrollable photos browser, then fullscreen lightbox with keyboard arrows; Photos section opens the same flow
- Restaurant photo lightbox uses a fixed full-viewport portal (not Ant Design Modal) so images stay centered instead of pushing a black slab below the fold
- Diner web restaurant profile (`/restaurants/...`) matches the mobile app on small screens: sheet over hero, Call/Directions/Website/Message tiles, booking card first, sticky Book footer that scrolls to the form; restaurant routes are full-bleed so the warm page bg no longer shows as side gutters
- Diner web `/reservations` list and detail match the mobile app on small screens: compact list cards with meta well, restaurant card + icon detail rows, overflow menu, and sticky primary CTA
- Partner reservation detail links the restaurant name (header subtitle + Visit card) to `/restaurant-profile?restaurant=`
- Transactional email is SendGrid-only; removed Resend fallback (`RESEND_API_KEY`, `resend` package)
- Ant Design DatePickers/calendars use US field formats (`M/D/YYYY`, `MMM YYYY`) via shared `antdUsLocale` — stock `en_US` still fell back to `YYYY-MM-DD`
- Reservation confirm/success date labels use `formatUsDate` (`Sat, 9/26/2026`) instead of dayjs long English
- Discovery search batches availability across the candidate set (one Mongo load for shifts/tables/reservations/claims) and returns `availableSlotTimes` on each item so diner home/map/SEO landings no longer fire per-card `availability` queries
- Partner Hub shell loads `MY_RESTAURANTS_SHELL` (id/name/status + `tableCount`/`shiftCount`/`hasMenuItems`) instead of nested tables, shifts, and full menus on every page
- GraphQL request-scoped DataLoaders for Restaurant, User, Table, bookmarks, shifts, menu, bookingWindow, Experience, and Reservation; compound Reservation `{ restaurantId, slotStart, status }` and Blackout `{ restaurantId, date }` indexes
- Restaurant page SSR now hydrates the full detail payload (menu/booking window/etc.); Stripe `DepositPayment` is `dynamic()`-loaded; gallery hero uses `next/image` with `priority` when the CDN host is allowlisted
- Web and dashboard Apollo clients use `BatchHttpLink` (max 10 / 15ms); API accepts GraphQL HTTP batches with one shared context so DataLoaders coalesce across the fan-out
- All diner/partner poll queries use `skipPollAttempt` when the tab is hidden (notifications, waitlist, messages, floor ops, pending counts)
- Discovery free-text search uses Mongo `$text` for multi-word queries (existing name/description/cuisine index) and regex for single-token prefix matches; demotes to regex when `$near` geo is applied
- GraphQL IP rate limit raised from 100 → 300 requests/min
- `groupAnalytics` aggregates the last 90 days; `conversations` filters to 90 days and caps at 100 threads
- Floor ops loads shifts once for turn-time instead of per seated table
- Mobile booking availability uses `cache-and-network`; RemoteImage accepts width/height for decoder downsampling

## [0.63.1] — 2026-09-23

### Fixed

- API build: `migrateStaffRoleToManager` uses pino’s `(obj, msg)` logger signature so production TypeScript compile succeeds

### Docs

- Managers daily ops and diner discover-and-book: cancel requires a reason; restaurant cancel includes reason in guest notifications
- Booking engine: manual approval Confirm is manager-side; document `cancellationReason` on partner cancel

## [0.63.0] — 2026-09-23

### Added

- Partner/admin **cancel reservation** confirmation modal with required preset reason and optional custom message (`RESTAURANT_RESERVATION_CANCELLATION_REASONS`)
- Cancellation emails (`booking_cancelled`) include the preset reason and optional custom message; diner in-app/SMS copy and restaurant manager alerts do too

### Changed

- Reservation row/action menus now show icons for Edit, Seat, No-show, Cancel, Delete (and Confirm/Complete where present)

### Fixed

- TextArea character counters (`showCount`) no longer overlap modal footers or the next form field (Ant Design absolute `-1lh` count positioning)

## [0.62.0] — 2026-09-23

### Added

- Restaurant **manual approval** for online bookings (default off): Booking policies switch + optional party-size rule (`>` / `≥` n); per-resource opt-in on tables, experiences, private dining spaces, and occasion packages. Matching bookings stay `pending` until staff Confirm; diners see “Awaiting approval”
- **+ Table** on Partner Hub `/floor-plan` so owners, managers, and admins can add tables while arranging the layout (without leaving for Tables & shifts)
- Package **manager seats** (`managerSeats`, min 1; Basic 1 / Core 3 / Pro 5) — owners invite Managers from Partner Hub → Settings → Team; upgrade package for more seats
- Partner sidebar Team page with seat usage, invite/remove managers, and Billing upgrade CTA when at limit
- `restaurantManagerSeats` query and admin Pricing field to configure seats per package
- Partner Hub `/accept-invite` to set a password and join after a manager invite (web `/accept-invite` redirects there)
- Partner sidebar **Reviews** with unreplied-count badge; diners posting a review notify venue owners/managers (`new_review` / `newReview` prefs)
- Diner account menu **My reviews** (`/reviews`) lists their ratings via `myReviews`
- Support replies (owner and managers) can include image attachments; they show inline in the chat thread
- Platform role `account_manager` with admin-dashboard access (assignable without super-admin elevation)
- Admin **Restaurant accounts** and **Admins** lists export the current filters as Excel, PDF, or JSON (`exportAdminUsers`)
- Owners and managers can **report a review** for platform moderation (`reportReview`) with Google/Yelp-style policy reasons; queue appears in Admin → Moderation
- Admin reservation detail (`/admin/reservations/[id]`) to view a booking and change date & time
- Admin moderation detail (`/admin/moderation/[id]?type=`) with management actions, owner reply, photo attachments, and More menu
- Admin sidebar/overview badge for pending moderation items (`adminPendingRequestCounts.moderationItems`)

### Changed

- Dashboard (and web edit-reservation) **Save / Submit** actions stay disabled until the form has changes (`useFormDirty`), preventing no-op mutation requests
- Restaurant venue role renamed from `staff` to `manager` (DB + GraphQL `UserRole`, invites, seats); boot migrates existing rows. GraphQL: `inviteManager` / `acceptManagerInvite` / `managerInviteByToken`. Docs section `/managers`
- Partner **Reviews** is a top-level Guests sidebar item (no longer only under the Guests hub)
- Admin sidebar: Accounts sits below Support; **Diners** → **Guests**, **Restaurant owners** → **Restaurant accounts**, **Platform users** → **Admins**
- Restaurant accounts list: role filter (Owner / Manager), venue filters, and role column; filter controls share one row when space allows
- Admins and Restaurant accounts pages open Roles & capabilities in a modal
- Roles & capabilities (Admins) and platform overview docs list view reservations / change date & time for all platform admin roles
- Admin account detail: URL `?tab=` for Overview/Restaurants, clearer overview cards, edit includes assigned restaurants, and Unassign on the Restaurants tab
- Partner Support ticket list cards open a detail page at `/support/[id]` with a chat-style conversation; requesters can reply with TipTap
- Admin ticket conversation is chat-style; triage sits in the right sidebar; internal notes stay admin-only and also use TipTap
- Managers can reply to the requester in TipTap; replies appear on Partner Hub Support
- Partner **Reviews** replaces unilateral Hide with **Report** for moderation; only platform admins can hide reviews (`setReviewHidden`)
- Admin Support-area list tables (moderation, slug/profile requests, tickets) and review lists collapse multi-actions into a More dropdown; row click opens detail where available
- Partner and admin reservation detail pages keep primary status + edit actions visible and move Message guest / No-show / Cancel / Delete into a More actions menu

### Fixed

- Restaurant booking form resets (date, party, time, occasion, notes, promos, add-ons) after a successful reservation so a second booking starts clean
- Review (and support) photo thumbs from local API uploads load again — CSP blocked `http://localhost:4000`; same-origin rewrite + `browserMediaUrl` + explicit local API origins in `img-src`
- Submitting a diner review no longer resets `PostVisitModal` back to the review form when the parent refetch clears the reviewable reservation
- Platform admins (`super_admin`, `account_manager`) can seat a reservation at a table — `seatReservationAtTable` no longer requires role `admin` only
- Support ticket screenshots were blocked by CSP on local API upload URLs (`http://localhost:4000`); `img-src` now allows the API origin
- Blog HTML is sanitized with `sanitize-html` on write and read; diner and dashboard apps send CSP, nosniff, and frame-ancestors headers

### Docs

- Venue role docs moved from Staff to Managers (`/managers`); admin labels Guests / Restaurant accounts / Admins
- Roles & capabilities cover manager seats, review report, and reservation date/time for platform admins

## [0.61.0] — 2026-09-23

### Added

- Partner support tickets use a rich-text editor and image attachments (JPEG, PNG, WebP, GIF)
- Restaurant owners and staff can open support tickets from Partner Hub `/support`; tickets appear in Admin → Tickets

### Changed

- Settings is now a pure hub of setup-tool cards; restaurant profile, location, contact, deposits, loyalty, media, booking widget, public URL, and preferences moved to their own **Restaurant profile** page (`/restaurant-profile`)
- Partner **Restaurant profile** uses the same left-section manage layout as Admin restaurant Manage (`?section=listing` … `operations`)
- Partner Overview location names link to Settings; Reservations, Waitlist, and Floor sit in a More menu
- Partner Overview header no longer duplicates the sidebar My restaurants link
- Partner Overview stats wrap three per row instead of squeezing all six into one desktop row
- Partner sidebar focuses on daily work; Grow and Insights hubs hold marketing and analytics pages
- Table layout and Tables & shifts live under Settings setup tools; Loyalty and Reviews open from Guests
- Admin sidebar collapses billing and platform tools into Billing and Platform hubs

### Removed

- Diner support tickets from web `/support` and the mobile Help center — diners use Contact instead
- Partner header plus button that duplicated Add restaurant

### Docs

- Partner sidebar hubs (Grow, Insights, Settings tools); admin Billing and Platform hubs
- Partner tickets from `/support`; diners use Contact instead of GraphQL tickets

## [0.60.0] — 2026-09-22

### Added

- Notification channel **Messenger** (Telegram Accept/Reject): owners always receive Elevaro fan-out; staff only when `newReservation.messenger` / `reservationUpdates.messenger` is enabled. Dashboard Notifications matrix + **Connect Telegram bot**.

### Changed

- `createElevaroTelegramLink` is limited to restaurant staff/owners/admins with venue access (not diners).
- Elevaro action webhook rejects Accept/Reject for non-owners when Messenger preference is off.


## [0.59.0] — 2026-09-22

### Added

- Super admins manage platform loyalty point packages and diner tiers on **Loyalty** (`/admin/loyalty`)
- Add restaurant requires a payment method after create, including during a free trial
- Add restaurant asks before closing if the form has unsaved changes; Keep draft stores the wizard until Discard
- Admin **Diners** exports the current search as Excel, PDF, or JSON
- Partner **Guests** exports the current restaurant list as Excel or PDF
- Admin **Data exports** includes restaurant guest CRM profiles and an Excel format

### Changed

- Admin Loyalty uses overview stats plus settings for point packages, tiers, and referrals
- Add restaurant modal stops 20% above the bottom of the viewport and scrolls inside that height
- Deposit amount must be greater than $0 when deposit required is on
- Partner Billing uses overview stats, a combined usage & invoice section, readable feature labels, and hides Free/custom plans from switch/subscribe options
- Partner Billing “Your subscription” explains the plan in plain language (price + what happens next + cover fees + timeline) with a Change plan menu instead of a dense details table
- My restaurants table names link to Settings; Reservations, Layout, and Settings sit in a More menu
- Diner `/profile` Notification preferences no longer shows the SMS text messages toggle
- Diner web and mobile loyalty progress and booking earn/redeem use live `loyaltyProgram` rates and tiers

### Fixed

- Selecting multiple restaurant photos now uploads every file instead of keeping only the last one
- Cover fee summary exposes per-source fee totals so Billing can show fees next to cover counts
- Diner profile Push notifications toggle stays on after refresh (local opt-in + restore/re-subscribe)

### Docs

- Super admins edit platform loyalty rates and tiers; diner clients read `loyaltyProgram`
- Partner Guests and admin Data exports include Excel; diner web profile hides SMS prefs

## [0.58.0] — 2026-09-21

### Added

- Dashboard page search (⌘K / Ctrl+K) jumps to partner or admin pages, settings tools, and switches restaurants
- Admins browse every booking at **Reservations** (`/admin/reservations`)
- Live floor area cards have an Edit button that opens Table layout filtered to that area (`?area=`)
- Owners request public profile changes from the dashboard; admins review them at **Profile requests**
- Admin sidebar, overview, and request queues show pending counts for public profile and URL slug requests
- Partner header location picker and Overview have an Add restaurant action (`/restaurants?create=1`)

### Changed

- Admin restaurant Overview groups profile, contact, and booking setup instead of dumping every field into one table
- Admin restaurant Manage uses a settings-style group list (listing, photos, contact, address, discovery, FAQ, press, policies, operations) instead of one long details form
- Admin restaurant Package shows current plan, status, and next billing before the change form
- Admin restaurant Menu matches Manage: left nav with icons, title + hint pane, and a single Save
- Admin restaurant Owner & Team assigns/removes accounts and shows readable roles
- Admin restaurant Tables and Shifts share one tab with inner Tables / Shifts views
- Floor ops area grids default to the full card width and a 40px cell size (same shrink-wrap fix as Table layout)
- Partner sidebar labels: **Live floor** (`/floor-ops`) and **Table layout** (`/floor-plan`)

### Fixed

- Admin restaurant menu dishes no longer show a second border around the whole list
- Live floor area grids hug table rows instead of leaving empty white space under a 240px min-height
- Partner Hub local `next dev` uses webpack instead of Turbopack, which was leaking ~23GB and then refusing connections on port 3001
- Partner Hub login mobile menu uses Ant Design 6 Drawer `size` instead of the deprecated `width` prop
- Tables & shifts “New area name” field in the floor-area select is typeable again, so partners can add a new area
- Empty `apps/api/.env` placeholders no longer wipe Google OAuth keys from the repo root `.env`
- Login accepts `a@tablevera.local` even when the seeded super admin is still stored as `admin@tablevera.local`

### Docs

- Staff: Live floor vs Table layout; public profile photo/copy changes wait for admin approval
- Admins: platform-wide Reservations queue and Profile requests
- API env: empty `apps/api/.env` placeholders inherit from the repo root `.env`


## [0.57.0] — 2026-09-21

### Added

- Elevaro Merchant Notifier integration: staff reservation alerts fan out to `@elevaro_merchant_bot` (Accept / Reject / Open) when `ELEVARO_NOTIFIER_*` is set; action webhook at `POST /webhooks/elevaro-notifier`

## [0.56.1] — 2026-09-18

### Fixed

- Diner reservation detail page no longer duplicates the `MenuProps` import (blocked production typecheck)

## [0.56.0] — 2026-09-18

### Added

- Diner restaurant Reviews section shows Leave a review after a completed visit
- Booking confirmation emails include an `.ics` attachment plus Google Calendar and View reservation buttons
- Floor plan details panel has a primary Save layout action, disabled until the canvas is dirty
- Menu editor Save menu control in the page header (submits the same form)

### Changed

- Partner Messages poll the open thread every 30s only while the tab is visible (inbox no longer polls)
- Public Pricing comparison uses a scrollable table on desktop and stacked cards on phones
- Diner reservation cards collapse extra details; the Details chevron tracks expanded state
- Diner reservation actions move secondary items into a More menu on narrow screens
- Add to calendar shows a success toast with a Google Calendar link after the `.ics` download
- Partner dashboard Overview/Analytics/Loyalty statistic cards share equal height; page loaders are centered
- Onboarding “Finish setting up your restaurant” alert hides the long description on small screens
- Restaurant Dashboard stays a fixed operational layout (not widget-configurable)

### Fixed

- Edit reservation now refetches the diner reservation queries after a successful update
- Whitespace-only diner and partner messages cannot be sent
- Password-reset emails use tighter button/fallback-link layout; SendGrid click tracking is off so reset URLs keep a valid certificate
- Forgot Password and other prefixed inputs keep space between the icon and the text
- Find a Table controls share a consistent 40px height and vertical centering
- Restaurant menu search sits with spacing below the Menu header
- Partner New Reservation / New Package modals stay in the viewport with internal scrolling
- Floor tables clamp to the canvas; Tables & shifts modal rows use consistent gaps
- Settings Save stays disabled until the form is dirty; restaurant settings persist with `$set` and success only after a returned id
- Spend alert accepts numeric amounts only, with an example placeholder
- Booking widget theme controls stack at narrow widths
- Waitlist/Private Dining tables keep readable headers, borders, and horizontal overflow
- Diner booking “Complete reservation” and “Join waitlist” share equal width when both are shown
- Partner Notifications uses the full content column; the mobile nav drawer is no longer a second desktop sidebar
- Marketing boost/gift-card modals have placeholders; campaign intro and New Boost wrap with spacing
- Email campaign helper text presents `{{firstName}}` / `{{restaurantName}}` as code tokens
- View as diner is disabled for restaurants that are not approved
- Continue actions in restaurant registration/onboarding place the arrow after the label
- Package title is required (client and shared schema) before submit

## [0.55.0] — 2026-09-18

### Added

- Floor plan tables rotate freely around their center by dragging the rotate icon on the table
- Partner reservations list: status filter, date presets (today, yesterday, this/last week, upcoming, past, custom), and a dedicated reservation details page (`restaurantReservation`)

### Changed

- Partner Tables & shifts splits tables and shifts into tabs (URL `tab`), with add/edit in modals instead of inline forms
- Table floor area is a searchable select; partners can add a new area name if it isn't listed
- Floor ops shows each floor area as its own grid; drag a grid corner or use Grid size to scale it
- Floor plan grid is resizable the same way: drag the canvas corner or use Grid size / Fit
- Floor ops silently polls `FloorPlanOps` every 30s and updates the map only when table/arrival data changes
- Diner restaurant page hides Hours and shows reservation windows without a timezone suffix

### Fixed

- Partner Hub "New reservation" notifications open the booking detail, including at other locations: staff payloads include `restaurantId`, and the page loads `restaurantReservation(id)` instead of scanning the current venue's list
- Owner booking emails show the reservation time in the restaurant's local timezone (from address/coordinates), not the API server's timezone
- Restaurant reservation day filters use the venue timezone instead of the API host clock

## [0.54.0] — 2026-09-18

### Added

- Admin restaurant detail: Reviews, Package, and Booking widget tabs; active tabs persist in the URL (`tab`, `section`)
- Shared `formatUsDate` / `formatUsTime` / `formatUsDateTime` helpers (`DISPLAY_LOCALE`)

### Fixed

- Floor ops no longer flashes the floor map skeleton on each `FloorPlanOps` poll (Apollo Client 4 treats polls as `loading`)

### Changed

- Partner booking widget theme (color, button text, reviews) sits with the embed script on Booking widget and Settings, not buried under operations
- `pnpm dev` no longer starts Expo; use `pnpm dev:mobile` for the diner app
- Reservation calendars no longer allow selecting past dates (diner booking, discovery search, partner create/edit)
- Dates and times display in US format (`en-US`, 12-hour clock) across web, dashboard, mobile, widget, and notifications
- Admin restaurant detail: Back sits above the title, status sits next to the name, and actions stay on the right

## [0.53.1] — 2026-09-18

### Fixed

- Mobile leave-review “Add photos” no longer crashes on iOS: restore `expo-splash-screen` plugin array syntax in `app.config.js` and ship `NSPhotoLibraryUsageDescription` (native rebuild required)
- Mobile restaurant hours card is collapsible again (weekly schedule behind Schedule toggle; open/closed status stays in the header)
- Mobile restaurant hero `1 / N` count and dots clear the overlapping content sheet (`HERO_SHEET_OVERLAP`)

### Changed

- Mobile restaurant hours: Schedule expands both reservation windows and weekly lines; timezone shown once in the status header; tighter vertical padding on the hours card

### Docs

- Mobile privacy permissions matrix notes photo library for review attachments
- Notes: photo-library native rebuild gotcha; hero sheet-overlap drives count/dot insets

## [0.53.0] — 2026-09-18

### Added

- Mobile Android `googleServicesFile` wired to committed `google-services.json` for FCM client registration
- Docs: mobile beta QA runbook (`docs/qa-mobile-beta-readiness.md`) and store permissions ↔ privacy matrix (`docs/mobile-privacy-permissions.md`)

### Fixed

- Mobile booking: `BOOKING_RESTAURANT` includes `tables.id` so Apollo cache normalization no longer crashes on Book
- Mobile EAS: replace stale `extra.eas.projectId` with live `@xondamir/tablevera` project `16386e83-34eb-4a95-8c46-2ec3c9b6d423`
- Mobile Android: force `expo-linear-gradient` to build from source (prebuilt AAR referenced missing `LazyKType` and crashed on startup)
- Mobile notifications inbox and push settings: sign-in uses `/sign-in` with `next` return path; offline session shows retry instead of a guest CTA
- Mobile push settings no longer auto-registers when permission is already granted (avoids racing root `PushBootstrap`)
- Mobile profile Book → sign-in now includes `resume=1` so booking drafts restore after login
- Mobile Apollo `errorLink`: network failures during token refresh no longer hard-sign-out (aligns with cold-start `sessionOffline`)
- Mobile favorites: offline session shows retry instead of a guest sign-in CTA
- API seed: remove “seed venue #N” copy; vary street addresses and lunch/dinner hours for demo venues

### Changed

- Mobile iOS bundle ID and Android package renamed to `uz.alitech.tablevera`
- Mobile push and inbox deep-links share one helper (`resolveNotificationLinkFromData`)
- Mobile `REGISTER_PUSH_TOKEN` lives under notifications feature API; Android channel light color uses theme primary
- Profile Language row hides chevron; Push alerts uses sliders icon; loyalty card drops QA mock flags and splits track UI into a sibling component
- Mobile StripeProvider sets `setReturnUrlSchemeOnAndroid`; Apollo cache adds `Table` keyFields for `bookableTables`
- Mobile Home popular/top-rated search `limit` matches visible card count
- Mobile booking time chips and favorite control use ≥44pt tap targets; slot chips expose accessibility labels
- Mobile Privacy Policy discloses optional write-only calendar access
- Mobile iOS `ITSAppUsesNonExemptEncryption: false` for App Store export compliance
## [0.52.1] — 2026-09-17

### Changed

- Demo super admin account is now `a@tablevera.local`; seed renames an existing `admin@tablevera.local` / `admin@reservations.local` super admin instead of creating a duplicate, and login accepts the old addresses as aliases

### Docs

- Seed credential tables in README, deploy guide, and docs site reference the new super admin email

## [0.52.0] — 2026-09-17

### Added

- Diners can attach up to 3 photos when leaving a review (web + mobile); photos show on restaurant and dashboard review lists
- Partner Reviews page: owners and managers can reply, auto-generate a personalized draft response (Gemini free tier via `GEMINI_API_KEY`), and add diner review photos to the restaurant gallery
- Restaurant logo on diner profile pages (web + mobile), with weekly hours under the open/closed status and a Google Maps link on the address

### Changed

- Restaurant discovery loading skeleton matches the real card layout (photo, title, rating, and slot placeholders)
- Diner and partner notification panels stay within the viewport so the settings footer is not clipped
- Website and partner dashboard layouts adapt more cleanly on mobile, tablet, and laptop screens

### Fixed

- Leave-review CTA and `createReview` allow past confirmed/seated visits, not only reservations staff marked `completed`
- Diner review star ratings start empty until the guest chooses a score
- `updateReservationStatus` no longer errors when the reservation is already in the requested status (e.g. Confirm on an already-confirmed booking)
- Admin restaurant reservation menu offers Confirm only for pending bookings, and cancel uses `cancelled` (API enum) instead of `canceled`

### Docs

- Diner, staff, API, and env docs cover review photos, partner replies (Gemini drafts), restaurant logos, and review eligibility for past visits

## [0.51.0] — 2026-09-17

### Added

- Admins can edit a restaurant's public URL slug from the restaurant manage form
- Restaurant owners can request a slug change from Settings; admins review requests at Admin → URL slugs
- Old restaurant slugs keep working via redirect after a change
- Diner reviews collect Overall, Food, Service, and Atmosphere ratings (web + mobile); restaurant and dashboard review lists show the quality breakdown when present
- Restaurant hero gallery shows the total photo count on the large image (web badge and mobile `1 / N` pill)

### Docs

- Admin and API docs cover restaurant slug editing, owner slug-change requests, and legacy slug redirects

## [0.50.3] — 2026-09-16

### Fixed

- Diner restaurant page no longer crashes on `/restaurants/{slug}` when no time slot is selected (confirm modal called `formatTimeInTimeZone` with null)

## [0.50.2] — 2026-09-16

### Fixed

- Diner web production build: drop invalid Ant Design Modal `styles.content` on the restaurant photo lightbox
- Admin restaurant detail Tables and Shifts tabs load table/shift data from GraphQL

## [0.50.1] — 2026-09-16

### Fixed

- API production build: allow restaurant `location` to be null when resolving timezone for availability slots

## [0.50.0] — 2026-09-16

### Added

- Admin dashboard splits diners, restaurant owners, and staff into their own list and detail pages, with create/edit/invite and venue assignment
- GraphQL `adminCreateUser`, `adminUser`, `adminUserReservations`, and `adminUserRestaurants` for platform account management
- Automatic monthly restaurant invoices (plan + cover fees by source) with a period breakdown on partner Billing
- Popular dish checkboxes in the menu editor (owners, staff, and admins) so the public restaurant page shows up to 10 curated items
- Restaurant working hours and bookable times shown in the venue's local timezone (from address), including experience cards and live slot pickers
- GraphQL `Restaurant.timezone` derived from US address / ZIP
- Dedicated diner experience booking flow (list cards → find a table → add-ons → summary)
- Partner photo uploader: drag-to-reorder gallery with a live public hero preview (first image large, next two beside it)

### Docs

- Admin docs: account management is split into diners, restaurant owners, staff, and platform users

### Changed

- Diner web app sends logged-in restaurant partners (non-diner roles) to the dashboard
- Partner login on the diner site also issues dashboard session cookies so the redirect to `dashboard.tablevera.online` does not require a second sign-in
- Public restaurant pages show popular dishes only (up to 10; first 8 if none are marked), instead of the full in-app menu
- Canonical restaurant URLs are `/restaurants/{slug}`; legacy `/r/{slug}` links permanently redirect there
- Availability slots are generated in the restaurant's local timezone instead of the API server timezone

### Fixed

- Restaurant photo lightbox close control is a dark circular button so it stays visible on light photos
- SendGrid confirmation emails no longer send an empty `attachments` array (SendGrid 400)

## [0.49.0] — 2026-09-15

### Changed

- Mobile app icons: Icon Composer package for iOS (`ios-app-icon.icon`), Android adaptive foreground/monochrome assets, and Android splash using the new foreground mark
- Mobile splash screen background color set to white (`#ffffff`)

## [0.48.0] — 2026-09-15

### Added

- Mobile in-app notifications inbox (`/notifications`) with FlashList infinite scroll, unread styling, mark-all, and detail bottom sheet
- GraphQL `AppNotificationConnection` with `offset` pagination on `myNotifications`
- Profile Preferences “Push alerts” route (`/notification-settings`)
- Mobile `CalendarXIcon` for cancelled-reservation notifications

### Fixed

- Mobile reservation detail “More actions” header button: overflow sheet no longer auto-dismisses on open (nested backdrop Pressable)

### Changed

- Mobile `/notifications` is the inbox; push permission settings moved to `/notification-settings`
- Dashboard and web notification queries use `myNotifications.items` / `total`
- Mobile notifications inbox uses flat rows with hairline dividers and quieter unread styling (typography + accent dot instead of primary-filled cards)
- Mobile notification icons use soft category tones (reservations forest, messages blue, points/reviews gold, cancellations danger + calendar-x) so glyphs stay readable without loud row fills
- Mobile notification detail sheet drops the type icon and shows a clearer relative + absolute timestamp with message-first body

## [0.47.0] — 2026-09-15

### Added

- Mobile Privacy Policy and Terms & Conditions screens (adapted from web legal pages)
- Profile Preferences rows for Privacy Policy and Terms & Conditions
- Sign-up Terms toggle links into the in-app Privacy and Terms screens

### Fixed

- Remove duplicate contact details on Privacy Policy and Terms screens (keep tappable contact cards only)

### Changed

- Legal related-document card: compact section label outside the card, no icon or shadow

## [0.46.2] — 2026-09-14

### Docs

- Cursor documentation rule for module learnings and changelog
- Split mobile auth and booking notes into dedicated files; add `[Unreleased]` section

## [0.46.1] — 2026-09-14

### Docs

- Mobile module learnings under `docs/notes/` (per-src notes, features index, LEARNINGS index)

## [0.46.0] — 2026-09-14

### Added

- Mobile Help Center with FAQ accordion and tap-to-contact (email, phone, website, Instagram, address)
- Mobile Favorites screen from Profile with undo-friendly unfavorite
- Mobile Notifications screen and Expo push bootstrap (`expo-notifications`)
- Instagram icon for mobile contact links

### Changed

- Profile Favorites, Notifications, and Help center rows navigate to dedicated screens
- Removed unused Profile “Password & security” placeholder row

## [0.45.1] — 2026-09-12

### Added

- Shared mobile `StatusTonePill` for reservation and deposit status badges
- Profile phone display with US formatting; Me/auth payloads include `phone`
- Auth `sessionOffline` state when tokens exist but Me cannot load

### Changed

- Bottom sheet `padded` prop for full-bleed date/party pickers
- Reservation detail/edit/messages use toasts for feedback; cancel keeps the modal open on failure
- Seated reservations are no longer guest-editable

### Fixed

- Unauthenticated reservation detail, edit, and messages prompt Sign in instead of a connection error
- Offline session no longer looks signed out on Profile and Reservations
- Save restaurant success toast on reservation detail

## [0.45.0] — 2026-09-12

### Added

- Mobile sign-out confirmation bottom sheet on Profile

### Changed

- Profile and Reservations signed-out empty states use horizontal padding; larger profile guest icon
- Auth screen back button uses neutral slate instead of primary tint
- Reservation status pills, billing sheet, and list/detail skeletons polish
- BottomSheet body layout and scroll sizing

### Fixed

- Deposit payment failure on reservation detail uses toast instead of a blocking alert

## [0.44.0] — 2026-09-12

### Added

- Mobile reservation messaging composer with auto-growing input and in-field send control
- Telegram-style message bubbles with sender grouping, day dividers, and curved tips

### Changed

- Reservation messages screen chrome, empty states, and bubble colors align with Tablevera tokens
- Icon-only buttons keep a fixed size while loading to avoid layout jump

## [0.43.0] — 2026-09-11

### Added

- Shared mobile `BottomSheet` and `Dialog` primitives with migrations for cancel, confirm, booking, loyalty, pickers, permission, and waitlist overlays
- Reservation detail flows for edit, messages, billing, cancel, and overflow actions
- Profile loyalty card UI and segmented control component
- New Lucide-based icons for reservations, profile, and messaging

### Changed

- Reservations list and detail screens use the new shared overlay shells and richer detail chrome
- Booking confirm, loyalty info, quick selectors, and date-time field reuse `BottomSheet`

## [0.42.1] — 2026-09-08

### Changed

- Mobile booking hardens slot matching, drafts, confirmation params, deposit payment return URL, and Apollo `bookableTables` cache policy
- Seed venues with Central Asian names get matching cuisine/description instead of rotated mismatched labels

### Fixed

- Booking confirmation reads `reservationId` search params more reliably and offers retry / view reservation when load fails
- Skeleton and date-time-field imports avoid require cycles through the components barrel

### Docs

- Mobile booking QA report for 2026-09-08 with live smoke notes and screenshots

## [0.42.0] — 2026-09-08

### Added

- Mobile booking deposit breakdown (base, add-ons, points, promo, gift) with due amount on the details step footer
- Loyalty redeem cards and how-it-works sheets for platform and restaurant points in booking

### Changed

- Confirm sheet frames deposit as a Stripe hold/authorization with clearer copy and scrollable sheet layout
- Deposit payment hook surfaces missing Stripe config and cancellation errors instead of treating stubs as live payments
- EAS profiles no longer bake empty `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`; rely on EAS secrets or local `.env`

### Fixed

- Booking submit routes to reservation detail with a clear error when deposit payment cannot start after create

## [0.41.0] — 2026-09-07

### Added

- Mobile booking flow split into datetime/details steps with dedicated hooks for data, form state, pricing, submit, and waitlist
- Waitlist empty state, success modal, and party-too-large handling in the booking flow
- Refresh-token reuse grace period and capped refresh sessions on the API; shared JWT expiry parsing for auth cookies
- Mobile token-refresh helpers with more reliable Apollo retry on expired sessions
- Availability and JWT expiry unit tests; Lunch weekend seed coverage and repair script

### Changed

- Availability omits past slots and treats shift `endTime` as the last seating start
- Restaurant profile loading skeleton mirrors the loaded layout (hero, sheet, actions, tabs, Book footer)
- Home bookings carousel and party-size pickers refined for booking/home consistency

### Fixed

- Reject creating reservations for slots that have already started
- Block duplicate waitlist entries for the same diner, restaurant, and date

## [0.40.0] — 2026-09-01

### Added

- Mobile two-step restaurant booking flow (date/time, then preferences, contacts, add-ons, and deposit)
- Booking confirmation screen and reservation detail screen with navigation from home and reservations list
- Reservations list with upcoming, past, and pay-deposit segments
- Premium party size bottom sheet with preset chips and separate 9+ stepper panel
- Stripe React Native integration for deposit payments (`EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
- Lucide occasion icons (cake, wine, briefcase, party popper, sparkles) and check icon asset

### Changed

- Restaurant profile Book CTA routes signed-in diners to the booking flow when online reservations are enabled
- Home bookings carousel opens reservation detail instead of the restaurant profile

## [0.39.0] — 2026-08-31

### Added

- Shared `RemoteImage` component powered by `expo-image` (memory-disk cache) for restaurant photos across discovery, search, home, and profile
- Shared `StarRatingDisplay` for review cards and summary
- Restaurant profile extractions pieces: photo lightbox, hours accordion, loading/error/empty states, and `useCreateReview` hook

### Changed

- Restaurant profile book footer uses sticky shadow and larger CTA
- Image call sites use stable `recyclingKey` values and theme spacing tokens

## [0.38.0] — 2026-08-31

### Added

- Mobile restaurant profile section tabs (details, menu, reviews, photos) with hero, meta, and quick actions
- Reviews tab: rating summary, review cards, write-review CTA, and add-review sheet with star rating input
- GraphQL `CREATE_REVIEW` mutation and `hasReview` on `MY_RESERVATIONS` for review eligibility
- Shared `StarRatingInput` component and subtle `UserAvatar` variant for review cards

### Changed

- Restaurant profile screen uses full-bleed hero, overlay header, and bottom sheet content layout
- Multiline `Input` aligns text and placeholder to the top

### Fixed

- Write-review CTA stays visible after submitting a review due to stale reservation cache

## [0.37.0] — 2026-08-28

### Added

- Shared discovery feature: cuisine chips, dining styles grid, location sheet/permission, and restaurant card exports used by Home and Search
- Search hooks for data fetching, handlers, and filter draft lifecycle; filters sheet split into focused subcomponents

### Changed

- Home and Search import discovery UI from `@/features/discovery` instead of duplicated home/search modules
- Search availability requires a reservation time; date/time/party chips appear when a time is selected
- Filters sheet header copy clarifies facet-only clear ("Clear facets")

### Fixed

- Search mode returns to results when the query matches the committed search again
- Top rated "See all" preserves the 4.5+ rating filter
- Location permission deny in the filters sheet no longer clears live near-me state
- Recent searches, browse shortcuts, and filter apply record the correct filter payload
- Recent search restore replaces stale facets and applies saved city/state
- Clearing the search field clears committed query; near me alone no longer skips browse
- Stale suggestion rows while typing; filter draft no longer resets when the store updates underneath

## [0.36.0] — 2026-08-28

### Added

- Mobile filters sheet: date/time picker, party size selector, and structured filter sections with draft/apply flow
- DateTimeField component and `@react-native-community/datetimepicker` dependency
- Reusable skeleton presets (chip rows, restaurant cards, meal tiles) with pulse animation

### Changed

- Search header shows filter summary; filter chips reflect draft vs applied state
- Location hook can return coordinates without updating discovery store (`applyToStore`)

## [0.35.0] — 2026-08-27

### Added

- Mobile location sheet: Google Places address search, near-me card, and soft location permission prompt
- Navigation icon and shared `useDebouncedValue` hook for search and places autocomplete

### Changed

- Location sheet UI: neutral list rows, search input styling, and refactored permission/places helpers

## [0.34.0] — 2026-08-27 / 2026-09-01

### Added

- Mobile search redesign: titled header, mixed idle discovery layouts, shortcut + active filter chips, and richer results empty state
- Search discovery API: trending terms, recent history, suggestions, and search event recording
- IconButton kit component and TrendingUp icon for search chips
- Partner **My restaurants** page and multi-location owner overview (today’s covers, waitlist, ratings per location)
- Admin bulk restaurant approve / reject / suspend and bulk delete
- Reservations can include experiences and private dining spaces (price and ticket qty on the booking)
- Experience optional `endDate` for multi-day events
- TipTap rich-text editor and live preview for admin email templates
- Docs access OTP email template (`docs_access_otp`) with branded fallback when no custom template is set
- Admin user-delete confirmation codes stored in Redis (with in-memory test fallback)

### Changed

- Selected filter chips use neutral filled pills; browse chips use softer corners and denser padding
- Home and restaurant profile screens split into focused section components
- Partner dashboard home overview rebuilt around the multi-location owner stats query
- Public restaurant page supports booking with an attached experience
- Docs access nav link added under admin; OTP send/store errors are clearer when email or Redis fails

### Fixed

- Restaurant name search matches prefixes/substrings (e.g. "sam" → Samarkand) instead of whole-word `$text` only

## [0.33.2] — 2026-08-26

### Fixed

- Dashboard production TypeScript build: menu editor types, admin restaurant menu item add, and invoice table row typing

## [0.33.1] — 2026-08-26

### Fixed

- API production TypeScript build: Magnific image error narrowing and discovery geo filter clone types

## [0.33.0] — 2026-08-26

### Added

- Mobile home discovery feed: location-aware sections, dining styles, bookings carousel, and live restaurant search
- Mobile restaurant search screen and restaurant profile route
- Restaurant card favorites toggle (GraphQL) with hours and cuisine meta chips
- Admin **Services** catalog (`/admin/services`) for billable platform add-ons with price, slug, and sort order
- Manual invoices with package duration, plan/billing cycle, service line items, discounts, branded PDF, email, and public pay links (`/invoice/[token]`) with Stripe card collection
- Admin restaurant detail (`/admin/restaurants/[id]`) with manage panels for menu, reservations, invoices, and package assignment (extends billing period)
- Admin exports: custom date range, CSV/JSON/PDF formats, and datasets for restaurants, reservations, cover fees, support tickets, reviews, and audit logs
- Magnific stock image picker shared helpers and discovery-magnific search proxy routes for admin taxonomy and partner flows
- API loads monorepo root `.env` then `apps/api/.env` (local overrides)

### Changed

- Mobile restaurant cards use soft shadow elevation, photo overlays for rating/favorite, and tighter home section spacing
- Admin restaurants list streamlined; partner dashboard home and menu editors expanded
- Public restaurant menu section layout and styling refreshed
- Stripe env docs clarify that invoice/deposit payments need the secret key on the API

### Fixed

- DoorDash/Uber Eats MHTML import prefers CDN menu photos (`src` / `data-src` / `srcset`) and merges duplicate item rows so images are less often missing

## [0.32.0] — 2026-08-26

### Added

- Mobile diner app rebuild: Expo Router under `src/app`, Unistyles Forest & Gold kit, feature modules, SecureStore JWT auth (email/password + Google)
- Mobile Google Sign-In env vars (`EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`) in `.env.example`

### Fixed

- Mobile logout now revokes server refresh tokens, clears Apollo cache, and signs out of Google
- Failed token refresh and failed/`null` `me` clear SecureStore and drop UI session state immediately
- Unistyles Button/Skeleton variant renamed to avoid Hermes `radius` theme collision

## [0.31.1] — 2026-08-25

### Fixed

- DoorDash MHTML import no longer truncates the page when CSS custom properties contain `--` (menu items were missing)
- DoorDash address parsing from “at street in city” og:description; cuisine bullets and hours extraction improved
- Restaurant name availability checks display name and slug variants; edits can exclude the current restaurant

### Changed

- Restaurant import is file upload only (`.mhtml` / `.html`); URL paste returns not-supported with clearer guidance
- Import modal simplified around file upload; additional parser unit tests

## [0.31.0] — 2026-08-25

### Added

- Admin **Discovery** taxonomy CMS (`/admin/discovery`) for categories, cuisines, occasions, and landmarks (images, sort order, active flag)
- Magnific stock image proxy (`/api/discovery-image`) for discovery hub thumbnails; `MAGNIFIC_API_KEY` env
- Local file upload fallback when DO Spaces is unset (`GET /api/uploads/local/:filename`, `.data/uploads`)
- Restaurant `categoryIds` / `landmarkIds` and discovery search by landmark
- `/best-restaurants` hubs and top-restaurants-by-state pages; richer discovery index rows and SEO link labels

### Changed

- Discovery hubs load taxonomy from the API (with seed defaults) instead of hard-coded lists only
- Photo upload and restaurant profile fields support discovery taxonomy assignment
- Google Places loader helpers expanded for address/device location flows

## [0.30.0] — 2026-08-21

### Added

- Docs site access gate: request + OTP login for approved emails, HttpOnly docs cookie, and admin **Docs access** queue (`/admin/docs-access`)
- `DOCS_APP_URL` / `DOCS_API_URL` wiring so the docs app talks to the API (CORS includes localhost:3002 by default)
- Admin audit log filters (actor / action / resource), copy-to-clipboard, and detail page
- URL list filters for cuisine and role on admin restaurants/users
- Discovery **Load more** button replacing infinite-scroll sentinel

### Changed

- Audit GraphQL queries support filter options and resource filters
- Restaurant search filter helpers and shared schema/constants formatting updates

### Fixed

- Docs OTP verification now stores codes in Redis instead of process memory, so verify works after API restarts
- Invalid or expired docs OTP codes show a clear message instead of "Internal server error"

## [0.29.0] — 2026-08-20

### Added

- Expanded discovery SEO hubs: states, landmarks, categories, top restaurants/locations, near-me (food/meals/cities), and cuisine×city / category×city landings
- Shared discovery meta helpers and `DiscoveryHubIndex` for hub listing pages with richer FAQ/JSON-LD
- Sitemap, robots, and `llms.txt` coverage for the new discovery URL patterns

### Changed

- City/cuisine/neighborhood landing copy and FAQ expanded with city-specific intros and booking guidance
- Discovery landing schema and infinite search wired for the new hub filters

## [0.28.1] — 2026-08-20

### Added

- Restaurant import modal **Paste link** tab for DoorDash / Uber Eats URLs (with MHTML fallback when blocked)
- Import from DoorDash / Uber Eats on partner **Public profile** and **Register** flows
- Unit tests for MHTML/HTML restaurant import parsing

### Changed

- Import modal accepts `.html` exports in addition to `.mhtml`, with clearer blocked-link instructions
- `/api/import-restaurant` accepts JSON `{ "url" }` or uploaded page files; parser supports base64 MHTML parts
- Settings and admin import handlers share common form prefill helper

## [0.28.0] — 2026-08-20

### Added

- Docusaurus documentation app (`apps/docs` on port 3002) for developers, diners, staff, admins, architecture, and LLM agents
- Restaurant import uploads cover and menu item images from DoorDash/Uber Eats into Spaces (`/api/import-restaurant/upload-image`)
- Partner overview cards/table view toggle (persisted in localStorage)
- Account-menu shortcuts to diner billing and partner billing / admin invoices

### Changed

- MHTML import extracts cover and per-item image URLs; dashboard settings/admin import save photos with the menu
- Turbo build outputs include Docusaurus `build/**`

## [0.27.0] — 2026-08-19

### Added

- Admin restaurant import flow from DoorDash/Uber Eats MHTML files (`/api/import-restaurant`) with dashboard import modal and menu prefill
- Diner billing history page (`/billing`) summarizing deposit authorized/captured/refunded/pending totals

### Changed

- Admin restaurant create/edit package selector now includes monthly/annual price presentation, trial timing, and combined package+status updates
- Dashboard overview and settings plan cards align with annual billing display helpers

### Fixed

- Email template variable extraction supports underscores in placeholder names

## [0.26.1] — 2026-08-18

### Fixed

- Booking widget GraphQL CORS: API reflects any origin so embeds work on restaurant websites
- Default widget `data-api-url` points to `https://api.tablevera.online/graphql`

### Docs

- Widget README documents local/static HTML embed testing with an explicit API URL

## [0.26.0] — 2026-08-17

### Added

- Public blog (`/blog`, `/blog/:slug`) with Article JSON-LD, sitemap entries, and admin CMS (`/admin/blog`)
- Partner marketing page at `/for-restaurants` with dedicated nav, contact-sales path, and photography
- Mobile nav drawer on diner web; restaurant marketing shell routes home to `/for-restaurants`

### Changed

- Annual plan prices display as billed yearly (with monthly equivalent note) on pricing and PlanPrice
- Admin pricing trial/feature form handling and plan override serialization
- Dashboard AuthLayout and register/signup payment UI polish; upload helper improvements

## [0.25.0] — 2026-08-15

### Added

- Partner plan changes with preview: upgrades take effect immediately with prorated charge; downgrades schedule at period end
- Stripe Payment Element on partner signup and billing (card setup or first invoice)
- `previewPlanChange` / `changePlan` / `planChangePayment` GraphQL APIs and plan-change policy tests
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` required on diner web and partner dashboard for Stripe.js

### Changed

- One paid upgrade per billing period; downgrades blocked while a trial is active
- Pending plan changes apply when the period ends (and on Stripe sync / feature checks)
- Address autocomplete Places loader and dashboard register/billing UI for card collection

## [0.24.1] — 2026-08-13

### Fixed

- Web production build: Twitter image config, discovery index pages, and related TypeScript issues
- Dashboard production build: reset-password parse error and Suspense around `useSearchParams`

## [0.24.0] — 2026-08-13

### Added

- Public SMS terms and opt-in page (`/sms`) with standalone consent form for Twilio Toll-Free Verification
- Optional SMS consent on diner registration and profile toggle for reservation/waitlist/availability texts
- Twilio TFV registration brief (`docs/twilio-sms-use-cases.md`)

### Changed

- Privacy and Terms pages document transactional SMS, STOP/HELP, and link to `/sms`
- Sitemap, footer legal nav, and `llms.txt` include the SMS page

## [0.23.0] — 2026-08-12

### Added

- Restaurant packages (partner CRUD at `/packages`) that diners can add at booking; package price rolls into deposit
- Availability alerts for favorited restaurants when a near-term table frees up (`availabilityAlerts` preference)
- Default Open Graph / Twitter share images
- Company contact block in the diner footer; occasion chips and package picker on the restaurant booking form

### Changed

- Sitemap cuisine/occasion URLs come from live discovery index data
- Legal and contact pages refreshed; `llms.txt` and SEO helpers updated

## [0.22.0] — 2026-08-12

### Added

- HttpOnly auth cookies for diner web and partner dashboard (`x-client-app`), with hashed refresh/reset tokens and hashed POS/integration API keys
- API hardening: Helmet, GraphQL depth/complexity limits, stricter auth/upload/partner rate limits, production Stripe/Telegram webhook secret checks
- Discovery hub pages (`/cities`, `/cuisine`, `/occasion`, `/neighborhoods`), richer sitemap (including `/r/:slug`), `llms.txt`, and Organization/WebSite JSON-LD
- Restaurant page SSR split with opening-hours schema and FAQ helpers for SEO
- Reservations list segments (upcoming / past / deposit due) and post-visit review + save modal
- Canonical redirect from `/restaurants/:slug` to `/r/:slug`
- Developer env checklist masks secret values

### Changed

- Default public site URL is `https://tablevera.online`; robots disallow additional account routes
- Gift-card public validation no longer returns recipient PII or full balance
- Stripe customer/subscription IDs only returned to users with restaurant access
- Uploads restricted to JPEG/PNG/WebP/GIF; partner API CORS limited to configured origins
- Dev phone OTP only when `AUTH_DEV_OTP=true` outside production

### Fixed

- Registration role clamped so signup cannot escalate privileges via config defaults

## [0.21.1] — 2026-08-12

### Added

- "Book again" on past reservations (pre-fills party size)
- Compact actions menu (edit / message / cancel) on the reservations list
- `past` status style on `StatusTag` for elapsed bookings

### Fixed

- Elapsed pending/confirmed/seated reservations no longer look active; edit, cancel, deposit, and message actions are limited to upcoming bookings

## [0.21.0] — 2026-08-12

### Added

- Diners can edit upcoming reservations (date, time, party size, occasion, notes)
- Cancellation and update notifications for diners and restaurant staff
- Web push service worker (`/sw.js`) and profile toggle that persists notification preferences
- Server-side logout that revokes the refresh token on diner web and partner dashboard
- Required cancellation reason presets (details required when choosing Other)
- `canManageBilling` / `canCreateRestaurant` role helpers; staff cannot add venues or change plans
- Pre-shift reports included in Core plan features

### Changed

- Plan feature checks use the current plan definition instead of stale stored feature flags
- Restaurant photo picker skips a broken Unsplash fallback and prefers valid listing photos
- Account menus route logout through the shared auth logout mutation

### Fixed

- Booking E2E tests reuse existing tables and cover diner edits, staff restaurant-create denial, and cancel notifications

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
