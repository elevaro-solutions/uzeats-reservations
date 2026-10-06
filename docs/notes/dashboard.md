# Dashboard — Learnings & Observations

## [2026-10-06] No-show fees report reuses reservation fee mutations
- Partner `/fees` (Insights) and Admin `/admin/fees` (Billing) share `NoShowFeeChargesReport`. Rows are reservations with fee activity; charge/retry/refund come from `buildNoShowFeeActionItems` + shared mutations so the table does not call hooks per row.
- API: `restaurantNoShowFeeCharges` / `adminNoShowFeeCharges` return items + `NoShowFeeChargeSummary`. Date range filters `noShowFeeChargedAt` (venue TZ for a single restaurant, platform TZ otherwise).
- Why it matters: Billing & invoices only lists prepaid deposits (`depositAmountCents > 0`). Card-guarantee collected fees live on this report, not the invoice list.

## [2026-10-04] Floor plan load effect must ignore Apollo cache writes
- `/floor-plan` hydrates from `FLOOR_PLAN_TABLES`. `updateTable` / `createTable` / `deleteTable` rewrite that query’s cache, so a `useEffect([data])` full reset looked like “blur/click outside cleared the selection.”
- Skip rehydrate when `loadedRestaurantIdRef` already matches, unless `forceHydrateRef` is set (Publish → refetch) or `activeRestaurantId` changes (clears the loaded id).
- Why it matters: Don’t clear `selectedIds` / local snapshot on every meta save. Details blur after editing capacity was the common repro.

## [2026-10-04] Manage collapse must force-render form fields
- Ant Design Collapse does not mount inactive panel children unless `forceRender` is set. `ManageDetailGroups` accordion (admin Manage modal, public-profile tab) only mounted Listing/Discovery, so `validateFields()` omitted address, lat/lng, FAQ, and press.
- The mutation then sent null coordinates and an address missing `line1`/`city`/`state`/`zip`. Production GraphQL masks each variable error as "Internal server error", which is why the toast repeats it.
- Save also merges `getFieldsValue(true)` so values written by `setFieldsValue` before a panel mounts are not dropped.
- Why it matters: Don’t remove `forceRender` on that collapse. A closed section is still part of the restaurant payload.

## [2026-10-03] Floor plan area backgrounds are per floor area
- `floorPlanAreaAppearances[]` (draft + published) stores per-area `backgroundColor` / `backgroundUrl`. Restaurant-level `floorPlanBackgroundColor` / `Url` remain legacy fallbacks when an area has no entry.
- `/floor-plan/settings` picks a floor area first; Save below the form drafts that state. Layout editor and Live floor resolve via `resolveFloorAreaAppearance(area, …)`.
- Why it matters: Changing Patio color must not recolor Main; layout save must keep sending `areaAppearances` so drafts are not wiped.

## [2026-10-03] Mobile nav: one sider, not a duplicate drawer
- Burger (≤991px) toggles the existing `Sider` via `collapsedWidth={0}` + `rt-dash-sider--mobile-open`. Layout width stays 0 so content is not pushed; CSS expands the fixed overlay. A `rt-dash-sider-mask` button closes on outside tap.
- Removed the portaled left `Drawer` that re-rendered the same `Menu` items (looked like a second identical sidebar).
- Why it matters: Don’t add a second Menu copy for mobile — keep one sider and overlay it.

## [2026-10-03] Live floor shows published customized layout
- `floorPlanOps` returns published `backgroundUrl` / `backgroundColor` / `floorFixtures` / scale. `/floor-ops` keeps per-area grid cards but renders shapes via the same canvas helpers + `useTableShapes` as Table layout.
- Why it matters: Draft-only layout edits won’t appear on Live floor until Publish; status fill colors stay for seating state.

## [2026-10-03] Floor plan Area settings page
- Canvas color/image (per area) and scale live at `/floor-plan/settings` (not the layout toolbar). Save draft / Publish send a full snapshot so position drafts are not wiped.
- Why it matters: Publishing area settings merges current draft tables/fixtures; don’t publish only `{ backgroundColor }` without loading the rest.

## [2026-10-03] Shape label position + font scale
- `TableShapeDef.labelPosition` / `labelFontScale` drive chip placement and size on `/floor-plan`. Positions include `outside_*` (label sibling of the clipped shape body so it isn’t cut off).
- Why it matters: Outside labels need `overflow: visible` on the table wrapper; keep icon/overlays in the inner clipped body.

## [2026-10-03] Shape icons: SVG upload + in-table render
- API uploads allow `image/svg+xml` after `sanitizeSvg` (strips script/foreignObject/on* / javascript:). Raster sniff unchanged; SVG is a separate sniff path.
- Floor-plan canvas draws `iconUrl` inside each table (behind the label chip). Prefer `<img src>` over inline SVG markup.
- Why it matters: Don’t re-block SVG globally for photos — only sanitize; keep restaurant gallery accept as raster-friendly `image/*` unless a caller opts into SVG.

## [2026-10-03] Floor plan canvas background color
- `floorPlanBackgroundColor` (hex) persists on Restaurant + draft; editor Color picker + presets; grid line contrast adapts for dark fills. Underlay image still optional on top.
- Why it matters: Draft load must prefer draft `backgroundColor`/`backgroundUrl` (including null clears) when `floorPlanDraft.updatedAt` is set — don’t fall back to published values for cleared fields.

## [2026-10-03] Superadmin table shape catalog
- Shapes live in `TableShapeDef` (seeded builtins). Superadmin CRUD at `/admin/table-shapes` with optional `iconUrl` upload and `renderPreset` for canvas silhouette.
- Partners load `tableShapes(active: true)` for pickers; uploaded icons replace built-in SVG glyphs. Deleting a shape reassigns tables to `rect` (rect itself cannot be deleted/deactivated).
- Why it matters: `Table.shape` is a free slug (not a fixed mongoose enum); canvas styling uses `renderPreset`, not the key alone.

## [2026-10-03] Floor plan shapes need glyphs + canvas cues
- Text-only Shape options look interchangeable; `TableShapeGlyph` / `TABLE_SHAPE_SELECT_OPTIONS` put an SVG beside each label in `/floor-plan` details and `TableFormFields`.
- Canvas distinction is more than border-radius: `shapeAccent` + `shapeCanvasExtras` add backrest bands, banquette side rail, high-top pedestal, communal dividers, and bar seat dots.
- Why it matters: Partners pick shapes by silhouette; don’t rely on the capacity subtitle alone.

## [2026-10-03] Floor plan: marquee, rooms, scale, templates, CSV, print
- Canvas empty-drag marquees tables; Draw room clicks vertices (Enter/Finish ≥3). Scale (`floorPlanScale`) and rooms persist via draft/publish.
- Templates only rearrange existing tables in the filtered area. CSV matches by table name (update) or creates. Print opens a print-friendly window from current canvas state.
- Why it matters: Publish still required before merchant mobile Plan view / live ops see layout meta changes from draft.

## [2026-10-03] Table layout: draft vs publish + canvas tooling
- `/floor-plan` keeps a local history stack and can `saveFloorPlanDraft` (Restaurant.floorPlanDraft) or `publishFloorPlan` (applies positions/fixtures/background, clears draft). Loading prefers draft positions when present.
- Overlap is warned per floor area (axis-aligned); publish blocks while overlaps remain. Alignment guides snap during drag. Fixtures live on the restaurant doc (not Table).
- Why it matters: Don’t refetch tables after local create while dirty; draft/publish is the persistence path for layout meta beyond `updateTablePositions`.

## [2026-10-03] Add table modal: shape was stripped by Zod
- GraphQL `TableInput` already had `shape`/`rotation`, and the floor-plan UI defaulted new tables to `rect` locally, but shared `tableInputSchema` omitted both fields so `createTable`/`updateTable` Zod-parsed them away. Shape only stuck via `updateTablePositions`.
- The Add/Edit table form (`TableFormFields` on `/floor` and `/floor-plan`) now collects shape; the schema accepts optional `shape`/`rotation` with **no defaults** (same reason as layout fields: `updateTable` `Object.assign`s the parse result).
- Modal body uses `overflowX: 'hidden'` (plus `.rt-table-modal`) so help-icon labels and the photo upload don’t force a horizontal scrollbar.
- Why it matters: Sending shape from the client is not enough if the shared Zod input schema still strips it.

## [2026-10-03] Partner overview is `/overview`, not `/`
- Owner/manager landing is `partnerLandingPath` → `/overview`. Root `/` only redirects (login / role bounce). Hosts still cannot open overview (`canAccessPartnerPath` blocks `/` and `/overview`).
- Summary stat cards are links; multi-location **All locations today** uses client table pagination (page size 10+). Recent alerts preview the latest 3 (`ALERTS_PREVIEW_LIMIT`); Show more opens a modal of the fetched list (up to 20). Each alert still opens a right Drawer (mark read + “View related” via `notificationHref` in `lib/notificationLinks.ts`, shared with the header bell).
- Why it matters: Don’t put overview UI back on `app/page.tsx`, and keep notification deep-links in one helper so the drawer and the bell stay aligned.

## [2026-10-03] Admin reservations: deletes leave stale cached pages
- Apollo's default `cache-first` keeps one `adminReservations` entry per variable set (each page, each search). `refetch()` after a delete only refreshes the current page, so other pages and earlier searches came back with deleted rows and old totals. The list now uses `cache-and-network`, and deletes evict the `Reservation` entities plus the `adminReservations` root field.
- Deleting the last rows of the final page left `?page=N` past the end. antd `Table` silently clamps its displayed `current`, so the pager and the URL `offset` disagree. The page now redirects to the last valid page once `total` loads.
- The API sorted by `slotStart` alone. Many bookings share a slot, so skip/limit order was not deterministic and rows repeated or went missing between pages. `_id` is now the tiebreaker.
- Why it matters: Any offset-paginated admin list with deletes needs all three: cache invalidation, page clamping, and a unique sort key.

## [2026-10-03] Setup guide: one model, two surfaces, client-only skips
- `lib/onboarding.ts` builds the grouped guide (`buildPartnerSetupGuide` / `buildPlatformSetupGuide`). `DashShell` renders the floating `SetupGuidePanel`; `/onboarding` and `/admin/setup` render `SetupChecklist` from the same model. Hosts get no guide, managers get no Payments/Team sections, and only `admin` / `super_admin` get the platform guide.
- Skips, "review" visits (`completeOnVisit` tasks with no data signal), and minimized/hidden flags live in `localStorage` (`rt-setup-guide:<userId>:<scope>`), not the API, so they don't follow the user across devices. Venues whose required steps were already done on first view start minimized.
- `useSetupGuide` refreshes its signals on any URL change (path or query), on window focus, and every 30s while the guide is incomplete. The shell restaurant list is refetched only on URL change/focus, not on the poll. Pages save through their own queries (e.g. `tableCount` isn't on `MY_RESTAURANTS`), and most setup work happens in place: approving from `/admin/restaurants?status=pending` never changes the pathname, so a pathname-only refetch left "Clear the approval queue" unchecked. Restaurant status mutations also `refetchQueries: ['PlatformSetupSignals']`.
- Use `completeOnVisit` only for "review" steps that have no data signal. Steps that ask for an action (inviting admins, adding rules) need a real count, or clicking Start ticks them off with nothing done. The admin-team step uses `adminUsers(roles: [admin, account_manager, super_admin]) { total } > 1`.
- Role/plan gates the guide follows: managers get no Payments/Team sections and no booking-rules step on plans without `accessRules` (Basic), because they can't upgrade. Owners on those plans get an "Upgrade plan" step instead. Deposits are hidden when `platformFeatureFlags.deposits` is off. The platform guide is only for `admin`/`super_admin`, and non-super admins see Stripe production as blocked but skippable. Stripe keys are API env vars, so "Connect Stripe" can only be checked off, not done from the UI.
- Why it matters: add new steps in `onboarding.ts`, not in the pages. Required steps decide the "ready to take reservations" state and the banner, so a new step should stay optional unless booking truly can't work without it.

## [2026-10-03] Reservations sidebar badge counts upcoming `pending` only
- `restaurantPendingReservationCount` counts `status: pending` with `slotStart >= now`, so it can be lower than the Pending filter on `/reservations` (which also lists past, never-confirmed bookings).
- Partner reservation mutations (`/reservations`, `/reservations/[id]`, `/floor-ops`) pass `PENDING_BADGE_REFETCH` to refetch the badge by operation name; other callers fall back to the 60s poll in `DashShell`.

## [2026-10-03] Address search needs CSP `maps: true` + script-src hosts
- Partner Hub `/register` and Add restaurant use shared `AddressAutocomplete` (Maps JS Places). Dashboard `next.config` previously sent `securityHeaders({ maps: false })`, and even `maps: true` only widened `frame-src` — `script-src` still omitted `maps.googleapis.com` / `maps.gstatic.com`, so the script tag hit CSP and never defined `window.google`.
- Why it matters: Fetching the Maps URL can return 200 while `<script src>` is blocked; UI falls back to a plain input and register’s address fields stay hidden until “Enter address manually” (or a successful Places pick).
- Fixed: CSP helper adds Maps script/connect hosts when `maps: true`; dashboard enables it. Autocomplete popup uses `getPopupContainer={() => document.body}` so `.rt-add-restaurant-modal` overflow does not clip suggestions.

## [2026-10-02] New tables always land at (0,0); `tableInputSchema` strips position
- `createTable` callers (`/floor-plan` + Table, `/floor` Tables & shifts, admin restaurant Tables, `provisionDefaultRestaurantSetup`) never set a position, and shared `tableInputSchema` has no `posX`/`posY`/`width`/`height`, so Zod strips them even though GraphQL `TableInput` declares them. Every new table is saved 2×2 at 0,0 and stacks on the previous ones until moved and saved.
- Why it matters: Fixing placement only on the client is not enough. The schema (or a server-side free-cell picker) has to change too.
- Fixed (same day): the schema now has optional `posX`/`posY`/`width`/`height` with **no defaults**, because `updateTable` reuses it and `Object.assign`s the result, so defaults would reset the layout on every edit. `createTable` runs `placeNewTable` (`apps/api/src/services/tablePlacement.ts`), which keeps a requested rect only when it doesn't overlap a same-area table (area match is case-insensitive) and otherwise uses `findFreeFloorSpot` from `@reservations/shared`. `/floor-plan` sends a spot computed from its local, possibly unsaved layout and then uses the returned position. Server checks run against *saved* positions only, so an unsaved local move can still produce an overlap until the layout is saved.

## [2026-10-02] antd 6 `Spin` with `display: block` loses centering
- Standalone `Spin` root is `.ant-spin-section` (`inline-flex`, column, `align-items: center`). Overriding it with `style={{ display: 'block', margin: '80px auto' }}` turns off the flex centering, and nothing sets `text-align`, so the dots render at the left edge. A bare `<Spin />` inside a `Card` is left-aligned too.
- Why it matters: Wrap loaders in a centering container (e.g. `display: grid; place-items: center`, as `AdminAccountDetail` does) instead of styling `Spin` directly.

## [2026-10-02] Admin reservations list row menu dividers
- `rowMenu` builds primary / status / secondary sections and only inserts a divider between non-empty sections. Cancelled (and completed/no-show) rows have no status actions, so the old always-push-divider pattern produced a double line between View and Open restaurant.
- Super-admin bulk delete uses table `rowSelection` + `Modal.confirm`; deletes run via sequential `deleteReservation` (no bulk mutation). Column cells use `nowrap` / `ellipsis` so When / Restaurant / Guest do not wrap into tall rows.
- Why it matters: Empty status sections still pushed dividers; long emails/`formatUsDateTime` commas wrapped without nowrap.

## [2026-10-01] Host sider + search filter
- `filterPagesForUser(..., { role })` + `DashShell` redirect use `HOST_ALLOWED_PATH_PREFIXES`. Hosts bounce from `/` and forbidden routes to `/reservations`. ⌘K search receives the same `role` so hosts cannot jump to Settings via search.
- Why it matters: Nav hide alone is not enough — deep links and search must enforce the same allowlist.

## [2026-09-29] Stripe environment switcher is super-admin
- `/admin/config` → Billing: Sandbox / Production `Segmented` (`stripeMode`). Non–super-admins see it disabled; saves omit the field. Mutation is super-admin only and requires the target mode’s secret keys to be configured.
- Switching to production asks for confirmation. Tags show whether sandbox/production secrets are present (from `stripeSandboxConfigured` / `stripeProductionConfigured`).
- Partner signup payment and diner Elements use `stripeClientConfig` (API-served publishable key) with `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` as fallback.
- Why it matters: Same pattern as signup email verification — regular admins must not flip live charges on a shared Save; Elements must track the API mode without a rebuild.

## [2026-09-29] Manual invoice auto-fills restaurant package
- Create manual invoice: selecting `restaurantId` sets `planKey` / `billingCycle` from `adminRestaurants.subscription` (annual if current period ≥ ~10 months) and re-runs catalog amount sync. Clear/no sub clears the package.
- Package section: Monthly/Annual `Segmented` above the plan select (default monthly). Plan option prices follow the cycle. Annual hides package duration and submits 12 months.
- Duplicate period: API throws `CONFLICT` with existing invoice details; admin UI requires justification then `forceCreate`. Default creates a new invoice and cancels the old one (period key freed as `YYYY-MM~canceled-INV-…`). Optional Replace checkbox sets `replaceExisting` to overwrite in place (same number).
- Why it matters: Don’t leave Package blank after restaurant pick — admins expect the venue’s live plan; don’t show monthly duration on annual invoices; don’t hard-block period duplicates without an override path; don’t replace by default.

## [2026-09-29] Platform SMS kill switch hides Premium SMS UI
- Admin → Platform configuration → Feature kill switches → **Premium SMS** (`featureFlags.sms`). Off = no Premium SMS card on partner `/billing`, no `premiumSms` in plan feature lists / package marketing for non-admins, no SMS column on partner Notifications (or admin diner prefs). Public `platformFeatureFlags` query; package overrides keep stored `premiumSms` for when SMS is turned back on. Admin pricing hides the Premium SMS toggle while the flag is off (`getFieldsValue(true)` keeps the prior value on save).
- Why it matters: Don’t re-surface “Premium SMS” in packages or Billing while the kill switch is off; OTP/auth SMS is separate.

## [2026-09-29] Billing usage & invoice layout
- Usage & invoices: cover usage for the period picker + invoice list (latest 3, Show all). Click opens a right Drawer (`?invoice=`) with pay / PDF / Open page; full page at `/billing/invoices/[id]`.
- `exportInvoicePdf` allows venue access (not admin-only). `restaurantInvoice(id)` is the partner single-invoice query.
- Avoid ant `Table` on this card — dash content wrappers add `overflow-x: auto` and short tables pick up awkward scrollbars.
- Why it matters: Owners need a short list plus deep detail without leaving Billing; PDF must work for partners.

## [2026-09-29] Open invoice count badges
- Partner `/billing` badges `restaurantOpenInvoiceCount` (active venue; status upcoming/pending/overdue with `totalCents > 0`). Admin `/admin/billing` badges `adminPendingRequestCounts.openInvoices` (platform-wide). Same 60s `skipPollWhenHidden` poll as other sider counts.
- `invoice_ready` notifications deep-link to `/billing` (with restaurant when present).
- Why it matters: Don’t poll full invoice lists from DashShell; don’t badge zero-dollar or paid/canceled invoices.

## [2026-09-29] Review report exchanges are chat-style
- `ReviewReportChat` is a messaging shell: bubble thread (asymmetric corners, brand fill for “mine”, auto-scroll) + compact composer (textarea, paperclip, send). Enter sends; Shift+Enter newline.
- Partner Hub Reviews and admin moderation detail both use it. `SupportAttachmentUpload` `variant="compact"` is for chat only; support tickets keep the large dragger.
- Why it matters: The old Card + tall textarea + full dropzone read as a form, not a conversation.

## [2026-09-29] Moderation reply is for the reporter
- Review report detail (`/admin/moderation/[id]?type=review`) sends `respondToReviewReport` with the support image uploader. Partner Hub reviews render `reportResponses` via `ReviewReportThread`.
- Why it matters: The guest-facing owner reply stays a separate action. Don’t put this composer on the public restaurant page.

## [2026-09-29] Signup email verification toggle is super-admin
- `/admin/config` → Security: “Require signup email verification”. Non–super-admins see it disabled and saves omit the field. Mutation rejects non–super-admin updates for that key.
- When on, web `/verify-email` and Partner Hub `/verify-email` gate unverified sessions after signup/login. Users enter a 6-digit code; local-dev shows the code when SendGrid is unset.
- Why it matters: Same pattern as Includes on pricing — regular admins must not flip a security default by accident on a shared Save.

## [2026-09-29] Includes editor and description generator are super-admin
- `/admin/pricing` shows Includes (add/remove lines) and Generate description only for `super_admin`. Saves from other admins omit `highlights` so they don’t wipe the list.
- Generate writes the description field and marks the form dirty; it does not save by itself.
- Why it matters: The public card reads `highlights` from the API. A non-super save that always sent the form’s highlights would clear lines the field never rendered.

## [2026-09-28] Review delete is super-admin (or author) only
- `deleteReview` allows the review’s `dinerId` or `requireSuperAdmin`. Regular platform admins still hide/report; Delete appears on admin restaurant Reviews, Moderation, and guest Reviews tab only when `isSuperAdmin`.
- Why it matters: Don’t gate permanent delete on `requireAdmin` — that would let account managers wipe reviews.

## [2026-09-28] Pricing package drag order
- `/admin/pricing` package rows use a handle (`HolderOutlined`) to reorder. Drop calls `reorderPlanPackages` and refetches. The list does not use the card loading spinner during that refetch.
- Why it matters: The public pricing page now follows API array order, so a client sort back to Basic/Core/Pro would undo the drag.

## [2026-10-02] Source pill vs UTM chips
- List Source is billing only (`widget` → “Widget”); `formatTrafficSource` returns null for widget/embed so it no longer duplicates as “Website widget”. Hover tooltip uses `originUrl` (else `referrer`).
- Detail chips from `attributionMetaChips`: Traffic (non-widget), UTM source / Medium / Campaign / Content / Term, Landing & Booked from (path with `?…`, full string on hover), Referrer.
- Why it matters: Widget + Website widget + raw query strings made the detail card unreadable; partners still need UTMs and the booking URL on demand.

## [2026-09-28] Visible packages include custom keys
- Billing plan changes, partner “add location”, and admin package assignment no longer drop `isCustom` plans. Public/partner pickers still hide `visibleOnPricing === false`. Admin assignment lists every non-`free` package so a hidden package can still be assigned.
- Why it matters: The pricing switch only updates `visibleOnPricing`. An `isCustom` filter made that switch look broken.

## [2026-09-28] Pricing package delete
- `/admin/pricing` shows Delete for custom packages (any admin) and for built-in Basic/Core/Pro only when the signed-in user is a super admin.
- Why it matters: Built-in keys are not `isCustom`, so a Delete button gated only on that flag never appears for the default packages.

## [2026-09-27] Source chip vs Traffic chips
- Superseded by [2026-10-02] Source pill vs UTM chips — widget traffic label removed; UTMs are explicit chips.
- List/detail **Source** is billing channel (`network` → label “Platform”). Extra chips from `attributionMetaChips`: Traffic (e.g. Google Business Profile), Campaign, Landing, Booked from, Referrer.
- Why it matters: Don’t overload Source with UTMs — partners need both fee channel and marketing origin.
## [2026-09-27] Slot clocks use restaurantTimeZone, not device local
- Floor-ops, pre-shift reports, messages `formatSlot`, admin restaurant day panel, admin reservations list/detail slot picker, and guest-detail When column pass `restaurantTimeZone(...)` into `formatTimeInTimeZone` / `formatUsDateTime`. List queries that only had `restaurant { id name }` now also select address/location when formatting slots.
- Why it matters: Partner Hub in UZ/EU browsers was showing US dinner slots shifted by device offset.

## [2026-09-25] Diner impersonation leaves Partner Hub
- `isPartner` must use the *target* role only — never `|| isImpersonating`. Impersonating a diner sets `tv_web_access` and redirects to the public web app; DashShell/useRequirePartner bounce diner roles off the hub.
- Admin restaurants “View as diner” opens the public booking URL; “Manage” goes to `/admin/restaurants/:id`.
- Guest detail (`AdminAccountDetail` kind=diner) tabs: reservations / reviews / points / notification prefs (plus overview). API: `adminUserReservations`, `adminUserReviews`, `adminUserLoyalty`.
- Why it matters: Admins must see the diner product, not Partner Hub chrome, when viewing as a guest.

## [2026-09-24] Deposit refund reason modal + floor-ops
- Shared `RefundDepositModal` (preset reason required; details required when “Other”) used on partner/admin list + detail and floor-ops. Mutation always receives `reason` for audit + diner notify body.
- Captured deposits show a USD amount input (defaults to remaining; supports partial). Authorization holds stay full-release only.
- Floor-ops drawer shows deposit line and Release/Refund when `canRefundDeposit`.
- Why it matters: Don’t use bare `Modal.confirm` for refunds — reason is required for support trails.

## [2026-09-24] Deposit column + partner/admin refund
- Partner `/reservations` and admin `/admin/reservations` tables show Deposit (amount + Held/Captured/Refunded/…). Refund/release is available when `depositStatus` is `authorized` or `captured` via `refundReservationDeposit`.
- Why it matters: List already fetched deposit fields but never rendered them; manual goodwill refunds previously required Stripe Dashboard.

## [2026-09-24] Experiences modal uses TimePicker + min/max guests
- Partner `/experiences` form stores clock values as dayjs via Ant Design `TimePicker` and serializes to `HH:mm` on submit (same pattern as Floor shifts). `minGuests` is required in GraphQL; legacy docs map to `1`.
- Why it matters: Don’t put free-text time inputs next to RangePicker — wrap forces End Time onto its own row and breaks validation UX.

## [2026-09-24] Email template test send
- `/admin/templates` **Send test** calls `sendTestEmailTemplate` with the open draft (subject/bodyHtml/bodyText) and sample vars; recipient defaults to `useRequireAdmin().user.email`. Subject gets a `[Test]` prefix. Requires `SENDGRID_API_KEY`.
- Why it matters: Preview is client-only; test send validates real SendGrid delivery and branding wrap.

## [2026-09-24] Ant Design DatePicker field format is US
- Stock antd `en_US` omits `fieldDateFormat`, so rc-picker defaults to `YYYY-MM-DD`. Shared `antdUsLocale` sets `M/D/YYYY` / `MMM YYYY` / `h:mm A` and both web + dashboard `ConfigProvider`s use it.
- Why it matters: Don’t assume `locale={enUS}` alone yields US date inputs — override `fieldDateFormat`.

## [2026-09-24] Reservations custom range + export
- `/reservations` “Custom range” uses `RangePicker` and URL `startDate`/`endDate` (legacy `?date=` still maps to a single-day range). Export menu downloads Excel/PDF/JSON for the current period/status filters via `exportRestaurantReservations`.
- Default period is `upcoming` (omitted from the URL). Multi-location owners get an **All locations** option (`locations=all`); list/export omit `restaurantId` and the table shows a Location column. New reservation stays disabled until a single venue is selected.
- Why it matters: Don’t reintroduce a single-day DatePicker for custom; multi-day lists show the When column, same as week/month periods. Don’t put `restaurant=all` in the shared shell param — use `locations=all` so DashShell keeps a real active venue.

## [2026-09-23] Google Business Profile booking links carry UTMs
- `BookingSharePanel` shows a clean booking URL plus a GBP-specific URL from `buildGoogleBusinessProfileBookingUrl` (`GOOGLE_BUSINESS_PROFILE_UTM`: source=google, medium=business_profile, campaign=reservations).
- Embed widget redirects use `WIDGET_EMBED_UTM` (source=widget, medium=embed, campaign=reservations) on "Complete reservation".
- Why it matters: Don’t paste the plain booking link into Profile Manager — partners must use the GBP row so analytics can attribute listing traffic. Widget traffic is tagged automatically; no embed attribute needed.

## [2026-10-03] Waitlist filters + outcome toasts
- `/waitlist` supports Live / History / All, source filter, and date filter. History defaults to restaurant-local today; live queue keeps all dates. Seat/Notify/Cancel toasts match merchant mobile outcome copy. Seat creates a walk-in reservation.
- Why it matters: Don’t default the live queue to today-only or future online joins disappear.

## [2026-10-03] Waitlist walk-in guest picker
- Add walk-in uses `searchWaitlistGuests` (Input + result list, not Ant Select). Matches platform diners by name/email/phone (digit-tolerant); guest-book visits sort first. Linked rows show “Walk-in · Account”.
- Why it matters: Guest-book-only search looked “broken” when diners had accounts but no prior visit at that venue.

## [2026-10-03] Waitlist edit entry
- Row actions include Edit for waiting/notified; same modal as Add walk-in calls `updateWaitlistEntry`. Clearing the linked guest sends `dinerId: null`.
- Why it matters: Hosts can fix party size / quoted wait without cancel+re-add.

## [2026-09-23] Shell polls pause when hidden; messages use skipPollAttempt
- DashShell notification/pending/profile/unreplied polls and waitlist/floor-ops/messages use `skipPollWhenHidden`. Partner messages no longer flip `pollInterval` via a visibility listener.
- Why it matters: Multiple open Partner Hub tabs were each polling every 15–60s in the background.

## [2026-09-23] DashShell uses shell restaurant query
- Partner chrome loads `MY_RESTAURANTS_SHELL` (counts + profile fields for onboarding), not nested tables/shifts/menus. Floor/Menu/Profile pages still use full `MY_RESTAURANTS`.
- Why it matters: Every Partner Hub navigation used to pay N× nested GraphQL field resolvers before the location switcher painted.

## [2026-09-23] TextArea showCount needs reserved margin
- Ant Design 6 positions `.ant-input-data-count` at `bottom: -1lh` outside `.ant-input-textarea-show-count`. Without margin on that wrapper, the counter overlaps modal footers, `Form.Item` extras/errors, and the next field (Cancel reservation, edit booking, report review, etc.).
- Global fix in `apps/dashboard` + `apps/web` `globals.css`: `margin-bottom: calc(var(--ant-font-size) * var(--ant-line-height))` on `.ant-input-textarea-show-count`; Form.Items that contain one use `margin-bottom: 8px` so spacing isn’t doubled with the default 24px item gap.
- Why it matters: Don’t “fix” with per-modal padding alone; any last TextArea + `showCount` before a footer will collide.

## [2026-09-23] Cancel reservation requires reason modal
- Partner + admin cancel (list, detail, floor-ops, restaurant reservations panel) opens `CancelReservationModal` instead of immediate `updateReservationStatus` with a hardcoded string.
- Presets: `RESTAURANT_RESERVATION_CANCELLATION_REASONS` in shared; optional message; details required when preset is `Other`. Combined via `buildReservationCancellationReason`.
- Why it matters: Don’t reintroduce one-click cancel with `"Cancelled by restaurant"` — guests need a real reason on the notification.

## [2026-09-23] Form Save disabled until dirty
- Shared helper: `apps/dashboard/src/lib/useFormDirty.ts` (`dirty`, `markDirty`, `clearDirty`, `onValuesChange`).
- Pattern: clear dirty after `setFieldsValue` / open / successful save; wire `Form onValuesChange={onValuesChange}` (and `markDirty` for non-form controls like photo uploads); disable Save/Submit / Modal `okButtonProps` with `disabled={!dirty}`.
- Why it matters: Prevents no-op GraphQL mutations from repeated Save clicks on unchanged edit forms.

## [2026-09-23] Manual approval in Booking policies + resource forms
- Restaurant profile → Booking policies: `manualApprovalEnabled` + optional party-size op (`gt`/`gte`) and threshold. Floor tables, Experiences, Packages, and Private dining each have a `requiresManualApproval` switch.
- Why it matters: Global rule and per-resource flags are OR’d at booking time; empty threshold with the switch on = all online bookings need Confirm.

## [2026-09-23] Floor plan + Table appends locally
- `/floor-plan` **+ Table** creates via `createTable` then appends to local canvas state (default 0,0 / 2×2). Do not refetch `FLOOR_PLAN_TABLES` after create while the layout may be dirty — the load effect resets positions and clears `dirty`.
- Why it matters: A post-create refetch silently drops unsaved drag/resize/rotate work.

## [2026-09-23] Role `staff` → `manager`
- Venue role enum value is now `manager` (was `staff`). GraphQL: `inviteManager`, `acceptManagerInvite`, `managerInviteByToken`, `defaultManagerRole`. Model `ManagerInvite` still uses Mongo collection `staffinvites`. Boot runs `migrateStaffRoleToManager` (users, invites, PlatformConfig field rename). Docs live under `/managers`.
- Why it matters: Don’t write role `staff` in new code; `account_manager` is a separate platform role.

## [2026-09-23] Partner Team + package manager seats
- `/team` (Settings hub child) lets owners invite/remove Managers (`manager`). Seat limit comes from the venue’s package (`PlanInfo.managerSeats`, default Basic=1 / Core=3 / Pro=5; always ≥1). Owner does not consume a seat.
- At limit: invite CTA disabled + Billing upgrade alert. `inviteManager` / `removeUserRestaurant` allow owners (manager role only on owned venues); admins keep full access. Seat enforcement also applies to admin create/assign.
- Admin Pricing edits `managerSeats` per package. Query `restaurantManagerSeats(restaurantId)` for used/pending/remaining.
- Why it matters: Don’t treat `dedicatedSupport` (“Dedicated account manager”) as venue manager seats — that’s platform support on Pro.

## [2026-09-23] Moderation detail + More menus + badge
- Admin Moderation list uses a More dropdown (View details / Dismiss / Hide / Hide & clear). Row click opens `/admin/moderation/[id]?type=review|message` with management sidebar, owner reply, photo attachments, and More actions.
- `adminPendingRequestCounts.moderationItems` (flagged reviews + messages) badges the Moderation sider item and overview shortcut; poll interval matches slug/profile counts.
- Slug/profile request Approve+Deny and review list Reply+Report/Hide also use More when multiple actions exist. Support ticket list More → View details; note/attachment row actions use More too.
- Partner `/reservations/[id]` and admin `/admin/reservations/[id]` keep status CTA + Edit visible; Message guest / No-show / Cancel / Delete live under More actions.
- Why it matters: Don’t put multi-button action clusters back in Support-area tables — use More. Detail page is the place for management + reply preview + attachments.

## [2026-09-23] Reviews in sidebar + unreplied badge + new_review notify
- `/reviews` is a top-level Guests sider item (no `parentSiderHref`). Badge = `restaurantUnrepliedReviewCount` for the active venue (visible reviews without `ownerReply`).
- `createReview` fans out `new_review` via `notifyRestaurantManagers`; prefs key `newReview`. Inbox deep-link opens `/reviews`.
- Guests hub cards still expose Loyalty only (Reviews left the hub).
- Why it matters: Don’t nest Reviews under Guests again; don’t badge total review count — unreplied is the actionable signal.

## [2026-09-23] Reviews: Report, not Hide
- Partner `/reviews` uses `reportReview` with shared reason labels/help. Modal requires details for `other`. Review stays public with a Reported tag until Admin → Moderation acts.
- Unilateral partner Hide was removed; `setReviewHidden` is admin-only. Admin restaurant Reviews panel and Moderation still hide.
- Why it matters: Don’t restore a partner Hide button for negative ratings — it breaks trust and conflicts with Google/Yelp norms.

## [2026-09-23] Restaurant managers under Restaurant accounts; Admins rename
- Accounts sider: Guests, Restaurant accounts (owners + `manager` as Manager), Admins (`admin` / `account_manager` / `super_admin`). `/admin/staff` redirects to `/admin/owners` (`parentSiderHref: '/admin/owners'`).
- `ROLE_LABELS`: `restaurant_owner` → Owner, `manager` → Manager; create/invite/filter/role column on `/admin/owners` use `RESTAURANT_ACCOUNT_ROLE_OPTIONS`. Managers require ≥1 venue.
- Roles & capabilities opens from a header button into a modal on `/admin/users` (platform matrix) and `/admin/owners` (Owner vs Manager). Platform matrix includes view reservations / change date & time for all three platform roles.
- Admin `/admin/reservations/[id]` shows booking detail; list and restaurant Manage → Reservations offer View details and Change date & time (`?edit=1` opens the modal).
- `exportAdminUsers` (xlsx/pdf/json) powers Export on Restaurant accounts and Admins with the same search/role/venue filters (5k row cap).
- Account detail keeps `?tab=overview|restaurants`, unassigns via `removeUserRestaurant`, and edits restaurant assignments in the modal.
- Why it matters: Don’t put Managers under Admins; platform operators are Admins only. Don’t re-add Managers as a top-level Accounts item.

## [2026-09-22] Settings is a hub; profile form lives on `/restaurant-profile`
- `/settings` is now a `HubLinkCards`-only hub like Grow/Insights — no restaurant selector, no forms. The full restaurant profile form (name/description/cuisine, location, contact & deposits, loyalty, logo, photos, booking widget + share panel, public URL/slug, and the online-reservations/operations preferences form) moved to `/restaurant-profile`, added to `PARTNER_PAGES` with `parentSiderHref: '/settings'` so it stays out of the sider but shows as the first Setup tools card and stays searchable.
- `/restaurant-profile` uses the same sticky left group nav as Admin Manage (`ManageDetailGroups` in `components/ManageDetailGroups.tsx`). Sections: listing, photos, contact, address, policies, operations, widget, slug. URL is `?section=` (plus `?restaurant=`). Discovery / FAQ / Press stay on Grow **Public profile** (change requests). One **Save changes** writes `updateRestaurant` and `updateRestaurantSettings`.
- Anything that used to deep-link straight into the profile form on `/settings` (onboarding `profile`/`golive` steps, the `/edit` legacy redirect, and the restaurant-row "Settings" actions/name links on `/` and `/restaurants`) now points at `/restaurant-profile` instead. `DashShell`'s `/edit` sider-highlight override still resolves to `/settings` (the hub) since `/restaurant-profile` isn't in the sider.
- Why it matters: Don't add new profile fields back onto `/settings` — that page must stay a thin card grid; extend `/restaurant-profile` groups. Don't import `AdminManageRestaurant` into the partner page (owner, featured, live slug write).

## [2026-09-22] Partner Support tickets
- `/support` lets owners and managers file `createOwnerSupportTicket`. Requester is the caller; restaurant must be one they own or are assigned to. Payload strips notes and assignee; attachments stay visible.
- Description is TipTap HTML (`sanitizeSupportHtml` + `htmlToPlainText` min 10). Image attachments (JPEG/PNG/WebP/GIF, max 8 × 10MB) go on `CreateOwnerSupportTicketInput`.
- List thumbs use `Image.PreviewGroup`. Dashboard CSP `img-src` must include the API origin so local `/api/uploads/local/*` (http) can render; Spaces is already covered by `https:`.
- Admin `/admin/support/[id]` conversation is chat-style (`SupportTicketThread`). Triage is the right sidebar. Replies use `addSupportNote(..., visibleToRequester: true)`. Owners reply with `addOwnerSupportReply`. Both reply composers accept image attachments (stored on the note). Internal notes stay hidden. Both composers are TipTap.
- Nav: Account → Support (sidebar + profile menu + ⌘K). Admin queue is still `/admin/support`.
- Why it matters: Don’t reuse admin `createSupportTicket` from the partner dashboard. Don’t hide owner screenshots in `toRequesterVisibleTicket`. Reply screenshots live on `SupportNote.attachments`, not ticket-level `attachments`.

## [2026-09-22] Sidebar hubs: Grow, Insights, Billing, Platform
- Partner sider omits pages with `parentSiderHref` (Grow/Insights children, Settings tools, Guests loyalty). Hubs: `/grow`, `/insights`; Settings cards include floor setup. **Reviews** is a top-level Guests sider item with an unreplied-count badge.
- Admin sider omits billing/platform children; hubs: `/admin/billing`, `/admin/platform`. Overview shortcuts match.
- `siderKeyForPathname` keeps the parent hub selected; pending profile badge sits on Grow.
- Why it matters: Don’t re-list every tool in the sider — extend `PARTNER_PAGES` / `ADMIN_PAGES` with `parentSiderHref` + description and use `HubLinkCards` / `hubChildPages`.

## [2026-09-22] My restaurants table: name link + More menu
- Table names are `/settings?restaurant=` links. Reservations / Layout / Settings live in a More dropdown like admin restaurants.
- Overview **All locations today** uses the same pattern: name → Settings, More → Reservations / Waitlist / Floor.
- `restaurantHref` / `isInactiveRestaurant` live in `lib/restaurants.ts`. Don’t put those three as fixed-right link buttons — they clip columns. Cards still keep footer actions.
- Why it matters: Name links must not call `selectRestaurant` in `onClick` — that re-renders DashShell and can abort Next.js navigation. Let `?restaurant=` switch the venue.

## [2026-09-22] Diner and guest list exports
- `/admin/diners` Export menu downloads the current search as Excel, PDF, or JSON (`exportAdminDiners`).
- `/guests` Export menu downloads the active restaurant's filtered guests as Excel or PDF (`exportRestaurantGuests`).
- `/admin/exports` has a Guests dataset (platform-wide CRM rows) and an Excel format next to CSV/JSON/PDF. Excel is a generated `.xlsx` (no extra package).
- Why it matters: Don't export only the current table page — these mutations use the same search/VIP filters with a 5,000-row cap.

## [2026-09-22] Admin Loyalty is stats + super-admin program editor
- `/admin/loyalty` shows StatCards then a settings list (Point packages, Tiers, Referrals). Rates and tiers persist on `PlatformConfig.loyalty`; shared `LOYALTY` / `LOYALTY_TIERS` are defaults only.
- `updateLoyaltyProgram` is `requireSuperAdmin`. Regular admins can view. Award/redeem paths and diner clients read `loyaltyProgram`.
- Why it matters: Don’t hardcode Bronze/Silver/Gold or 100 pts/visit in new UI — query `loyaltyProgram`. Keep one tier at 0 visits.

## [2026-09-22] Partner Billing is plan + period invoice, not cover totals
- `/billing` shows StatCards (plan / next charge / period covers), then plan details, a single period picker for usage + invoice, Premium SMS, and enabled features with readable labels. Free/custom/`visibleOnPricing: false` plans are omitted from switch/subscribe.
- Cover fee table columns are covers + fee $ (`networkFeeCents` … on `coverFeeSummary`). Cover totals are a breakdown; the period invoice is the bill.
- Why it matters: Don’t treat Cover Fee Summary as payable; SMS add-on is Core+, included on Pro — Basic stays disabled with copy saying so.

## [2026-09-22] Partner add-restaurant modal: photos, deposit, unsaved, payment
- `PhotoUpload` gallery mode used to drop extra files: Ant Design calls `beforeUpload` per file with a stale `value` closure, so concurrent uploads each wrote `[...old, url]` and the last write won. Append through a `urlsRef` so multi-select keeps every photo.
- Deposit required + `$0` is rejected in the form (`depositAmountWhenRequiredRule`) and in `restaurantInputToDb`.
- Cancel / overlay / Escape confirm before closing a dirty create wizard. **Keep draft** hides the modal and stores fields, photos, step, and plan in `sessionStorage` (`rt-add-restaurant-draft`) until **Discard** or a successful create. Re-opening Add restaurant restores that draft. The modal is not `destroyOnHidden`.
- The add-restaurant modal max-height leaves 20vh below it (wrap `padding: 40px 16px 20vh` + `overflow: hidden`; body scrolls).
- `createRestaurant` always collects a payment method (`collectPaymentMethod: true`) and returns `clientSecret` / `paymentMode`. The add-restaurant flow opens a non-dismissible payment modal after create, including during a trial. Demo Stripe (no publishable key or no secret) still shows that modal with Continue.
- Why it matters: Don’t skip the card step because `trialDays > 0`. Don’t append gallery URLs from the `value` prop inside concurrent `beforeUpload` handlers. Don’t reset the create wizard except on Discard or after submit.

## [2026-09-21] Dashboard Turbopack OOM kills :3001
- `next dev` (Turbopack, Next 16.2) grew to ~23GB then `FATAL ERROR: Ineffective mark-compacts near heap limit`. Chrome then shows `ERR_CONNECTION_REFUSED` on `/login`. Turbo does not restart the persistent task.
- Dev script is `next dev --port 3001 --webpack`. Production `next build` / `next start` unchanged.
- Why it matters: Connection refused on 3001 after a long session is usually this OOM, not a missing `pnpm dev`.

## [2026-09-21] Live floor vs Table layout
- Sidebar: `/floor-ops` is **Live floor** (tonight’s seating), `/floor-plan` is **Table layout** (editor). URLs stay the same. Search still matches the old “floor ops” / “floor plan” terms.
- Live floor area canvases use `width: 100%` + 40px cells; do not write ResizeObserver pixels back onto `resize: both`. Height is `bounds.rows * cellSize` (`height: fit-content`) — a 240px min-height left a blank band under short areas.
- Why it matters: “Floor ops” vs “Floor plan” is easy to mix up; a small dashed grid on a wide Live floor card is the shrink-wrap loop.

## [2026-09-21] Page search is role-aware and shares the nav catalog
- `lib/dashboardNav.tsx` is the source of truth for Partner Hub and admin pages (sidebar + ⌘K search). Pages with `parentSiderHref` stay searchable but out of the sider (hubs: Grow, Insights, Settings tools, admin Billing/Platform).
- `DashboardSearch` mounts from `DashShell` (header + mobile sider search). Partners can also switch restaurants from the palette. Recent picks live in `localStorage` (`rt-dash-recent-pages`).
- Why it matters: Don’t hardcode a second nav list for search — extend `PARTNER_PAGES` / `ADMIN_PAGES` instead.

## [2026-09-21] Admin reservations is a platform-wide list
- `/admin/reservations` uses `adminReservations` (`requireAdmin`). Date periods without a restaurant use `America/New_York`; a selected venue uses that restaurant’s zone.
- Guest search matches diner name/email/phone and restaurant name (and Mongo ids). Per-venue bookings stay on `/admin/restaurants/:id?tab=reservations`.
- Why it matters: Don’t reuse `restaurantReservations` without an id for the admin queue.

## [2026-09-21] Partner add-restaurant lives on `/restaurants?create=1`
- Location Select footer, Overview extra/empty state, and onboarding empty state open My restaurants with `create=1`. There is no header plus icon.
- The create modal strips `create` from the URL on cancel so refresh does not reopen it. Managers do not see the actions (`canCreateRestaurant`).
- The location Select `open` is closed on add/navigation so the dropdown does not sit on top of the modal (DashShell stays mounted).
- The footer uses `preventDefault` + `stopPropagation` on mousedown so the Select does not swallow the click. That combo is wrong for popup inputs (it blocks typing) — button-only footers are fine.
- Why it matters: Don’t add a second create wizard in the header — deep-link the existing modal.

## [2026-09-21] Pending request counts live on adminStats and a cheap poll
- Sidebar badges for URL slugs / Profile requests use `adminPendingRequestCounts` (60s poll). Overview cards reuse `adminStats.pendingSlugRequests` / `pendingProfileChangeRequests`. Partner Public profile badges a pending request for the active restaurant.
- Why it matters: Don’t poll full `adminStats` from DashShell just for nav badges.

## [2026-09-21] Public profile edits from partners are requests
- Partner `/profile` submits `requestRestaurantProfileChange` (pending until admin approve/deny). Live diner copy stays until review. Admins still edit immediately on restaurant Manage; a live admin profile save denies other pending requests.
- Why it matters: Don’t treat Public profile Save as a live write. Queue is `/admin/profile-requests`.

## [2026-09-21] Admin restaurant Overview is a snapshot, not a second details form
- `/admin/restaurants/[id]` Overview shows identity, clickable Package/Menu/Floor/Team stats, About, Contact, and booking flags. Full fields stay on Manage and the other tabs; snapshot cards call `goToTab`.
- Manage details use a left group list (`?tab=manage&section=listing` … `operations`). Public profile fields live in Discovery / FAQ / Press on that same page; Package/Menu/Team have their own page tabs. Tables and Shifts share one page tab (`?tab=tables` / `?tab=shifts`) with inner subtabs so old shift URLs still work.
- Menu (`?tab=menu`) uses the same pattern as partner `/menu`: a section sidebar, one category open, dishes collapsed until expanded. Empty dish names are dropped on save; Popular is still capped at 10 for the diner page.
- `section=details` and `section=profile` still resolve (listing / discovery). The list Edit modal keeps Details | Public profile | Package | Accounts, with accordion groups inside those tabs.
- Why it matters: Putting every restaurant field back in a 3-column Descriptions table duplicates the header and the tabs. A single long Manage form is the same problem.

## [2026-09-19] Select popup `preventDefault` on mousedown blocks typing
- `FloorAreaSelect` footer used `onMouseDown={(e) => e.preventDefault()}` to keep the dropdown open. That also cancels input focus, so “New area name” inside Add/Edit table could not be typed. Use `stopPropagation` instead, and `focusable={{ trap: false }}` on that Modal so the portaled dropdown input is not yanked back by the focus lock.
- Why it matters: Custom Select `popupRender` inputs in a Modal fail in two ways: mousedown preventDefault, then Modal trap.

## [2026-09-19] Floor ops area Edit deep-links Floor plan `?area=`
- `/floor-ops` area cards Edit to `/floor-plan?area=` (and `restaurant=` when set). Floor plan reads `area` from the URL and writes it back when the area select changes; unknown areas are dropped after tables load.
- Why it matters: Don’t keep a parallel `areaFilter` useState — it would ignore the Floor ops link.

## [2026-09-19] Floor plan canvas size must not be written back from ResizeObserver
- `/floor-plan` measures the wrap to compute how many 40px cells fit. Writing that `clientWidth`/`clientHeight` back onto a `resize: both` element locks a shrink-wrapped first layout (often ~8×6 cells) instead of filling the card.
- Default cell size is `DEFAULT_CELL_SIZE` (40px); Fit still sets `gridCellSize` to `null` and uses `cellSizeForWidth`. Keep initial wrap size in CSS (`width: 100%` + flex fill), not React pixel styles.
- Why it matters: A small dashed grid on a wide card is almost always this feedback loop, not missing table data.

## [2026-09-18] Mobile nav must not add a second Layout column
- Ant Design 6 `Layout` with `has-sider` is `flex-direction: row` and sets direct child `.ant-layout` to `width: 0`. Superseded by [2026-10-03] Mobile nav: one sider — no portaled Drawer; overlay the same `Sider`.
- Partner `/notifications` also skipped the default `.rt-dash-content` `max-width: 1200px` (`margin: 0 auto`) so the page fills the column after the primary nav instead of looking like a second sidebar gap.
- Why it matters: An empty strip next to the sidebar is usually a Layout child or centered max-width, not a second Menu.

## [2026-10-05] Table deposit fields are optional in tableInputSchema
- `depositRequired` / `depositAmountCents` have no zod defaults because `updateTable` does `Object.assign(existing, parsed)`. Callers that omit them (CSV import, admin minimal form) keep the saved override instead of resetting it.
- Table forms hold `depositAmount` in dollars. Convert with `tableDepositFormValues` / `tableDepositInput` from `TableFormFields`.
- Why it matters: Fields with defaults (`requiresManualApproval`) are reset by any update that omits them. The admin Tables tab form does this for manual approval today.
