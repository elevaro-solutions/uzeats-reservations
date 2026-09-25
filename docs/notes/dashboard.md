# Dashboard — Learnings & Observations

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
- `DashboardSearch` mounts from `DashShell` (header + mobile drawer). Partners can also switch restaurants from the palette. Recent picks live in `localStorage` (`rt-dash-recent-pages`).
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

## [2026-09-18] Mobile nav Drawer must not sit in a Layout flex row
- Ant Design 6 `Layout` with `has-sider` is `flex-direction: row` and sets direct child `.ant-layout` to `width: 0`. A left `Drawer` as a sibling of `Sider`/`Content` can leave an empty column even when closed. Keep the desktop `Sider` in a `hasSider` row; portal the mobile `Drawer` to `document.body` outside that Layout.
- Partner `/notifications` also skipped the default `.rt-dash-content` `max-width: 1200px` (`margin: 0 auto`) so the page fills the column after the primary nav instead of looking like a second sidebar gap.
- Why it matters: An empty strip next to the sidebar is usually a Layout child or centered max-width, not a second Menu.
