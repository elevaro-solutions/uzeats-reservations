# Web — Learnings & Observations

## [2026-10-09] Confirm modal keeps money out of the details list
- `ReservationConfirmModal` shows date/time/party as a summary strip; guest/table/notes stay in a light detail list. Package/room/experience prices, 3D fee, discounts, Due now, and card guarantee live in a separate charges card. Full terms stay behind Collapse so the agree checkbox stays above the fold.
- Why it matters: Mixing fee policy paragraphs into bordered Descriptions made the modal feel like one long spreadsheet and pushed Confirm below the viewport.

## [2026-10-09] Blog reads are client-recorded once per tab session
- `BlogReadTracker` on `/blog/[slug]` calls `recordBlogPostRead` after mount. `sessionStorage` key `blog-read:<slug>` prevents refresh double-counts in the same tab. Server/ISR render never increments (crawlers without JS stay out of the count).
- Why it matters: Do not `$inc` inside the article RSC/query — cached HTML and bots would inflate reads.

## [2026-10-06] Stripe Payment Element ready before card actions
- `DepositPayment` and `/reservations/pay` wait for Payment Element `onReady` before showing Cancel / Save card / Pay now. `stripe` + `elements` existing is not enough — the iframe can still be loading.
- `onLoadError` still reveals Cancel (and disables Save/Pay) so a failed Stripe load is not a trap.
- Why it matters: Clicking Save card before the Element is mounted returns a Stripe error or no-ops.

## [2026-10-06] My reservations list is client-sorted, not API order
- `myReservations` returns `slotStart: -1` (latest first). Upcoming / action-needed tabs re-sort soonest-first; Past stays most-recent-first.
- Why it matters: Same-day bookings looked reverse-chronological on Upcoming.

## [2026-10-03] Discovery map needs Maps hosts in CSP script-src
- Prod showed "Map unavailable" even with `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` baked in. The Maps loader `<script>` was present but `performance` reported `responseStatus: 0` and `window.google.maps` stayed undefined — CSP blocked `https://maps.googleapis.com`.
- `securityHeaders({ maps: true })` only opened `frame-src` for embed iframes; it did not allow the JS API. Fix: when `maps` is true, also add `maps.googleapis.com` and `maps.gstatic.com` to `script-src`.
- Why it matters: A missing/invalid key and a CSP block look the same in the UI ("Map unavailable").

## [2026-09-29] Restaurant reviews preview + all-reviews modal
- Profile `#reviews` shows `RESTAURANT_REVIEWS_PREVIEW_LIMIT` (5) with a `ReviewSort` Select (newest / oldest / highest / lowest). `restaurantReviews(sort:)` is server-side.
- "Show all N reviews" opens a modal (same pattern as photos browser) rather than a dedicated route so diners stay on the booking profile. Modal reuses sort + paginates with growing `limit` (max 100).
- Why it matters: Full-page reviews would drop booking context; dumping every review inline makes long profiles hard to scan.

## [2026-09-29] Review Read more hides owner reply
- `RestaurantReviewCard` clamps comments to 2 lines. Owner reply renders only when expanded. Read more also appears when there is an owner reply even if the comment fits.
- Hover-to-react uses `REVIEW_REACTION_OPTIONS` without login. Web Apollo sends `X-Visitor-Key` from `localStorage` (`tv_visitor_key`) so guests can toggle reactions; signed-in users still use their account.
- Why it matters: Showing the full owner reply under a clamped guest comment made short cards look like walls of text.

## [2026-09-29] Signup email verification page
- When `needsEmailVerification` is true, AppShell redirects to `/verify-email`. Users submit a 6-digit code. Signup may store a local-dev code in `sessionStorage` (`tv_verify_dev_code`) when SendGrid is unset.
- Why it matters: With the admin toggle on, creating an account must not drop people on the homepage unverified.

## [2026-09-28] The Apollo auth-refresh link replays mutations
- `errorLink` in `lib/apollo.tsx` forwards any operation whose response carries `Authentication required` after refreshing the session — mutations included. It now marks the operation context (`authRetried`) so each one replays at most once; without the cap a persistent auth error re-sent the operation on every pass.
- On refresh failure, queued operations are rejected (`rejectPendingRequests`) instead of being dropped; the old code cleared the array and left those subscribers hanging forever behind a spinner.
- The same link shape lives in `apps/dashboard`, `apps/mobile`, and `apps/merchant-mobile` — mobile already rejects pending requests but still has no replay cap.
- Why it matters: Anything non-idempotent (booking, payment confirm) can be executed more than once by the transport layer, so writes need their own server-side guard.

## [2026-09-29] Pricing Includes come from the API
- `/pricing` card bullets use `plan.highlights` when the field is an array, including an empty array. `PLAN_HIGHLIGHTS` is only the fallback when the query omits the field.
- Why it matters: A missing array and an empty array are different — empty means a super admin cleared Includes.

## [2026-09-28] Public pricing visibility is `visibleOnPricing` only
- `/pricing` cards include every plan with `visibleOnPricing !== false`, including custom keys. The compare grid still uses the static Basic/Core/Pro matrix for those three keys when they are visible.
- Why it matters: Filtering `!isCustom && isStandardPlanKey` made a new package flash (API list) and then vanish. The admin switch is the only public-catalog gate.

## [2026-09-28] My reviews can delete
- `/reviews` Delete calls `deleteReview`; only the signed-in author succeeds (API enforces). Confirm modal before mutate; refetch `myReviews`.
- Why it matters: Author delete lives on diner web, not Partner Hub.

## [2026-09-27] Booking attribution is first-touch in sessionStorage
- `BookingAttributionCapture` writes UTMs + `landingPath` + external `referrer` to `tablevera_booking_attribution` on navigation. First UTM touch wins for the tab session.
- `createReservation` spreads `getBookingAttributionForSubmit()` (stored UTMs + current `originUrl`). API `resolveDinerReservationSource` maps widget UTMs → billing `source=widget`; Google GBP stays `network` with `utmSource=google`.
- Why it matters: Partners see Platform vs Google Business Profile vs widget without conflating cover-fee channel and campaign traffic.

## [2026-09-27] GA4 loads with Consent Mode, not after consent
- `GoogleAnalytics` always injects gtag when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set, but defaults `analytics_storage` / `ad_*` to denied. `cookieconsentchange` calls `gtag('consent', 'update', …)`.
- Page views use `send_page_view: false` + manual `config` on App Router pathname/search changes so client navigations are counted.
- Why it matters: EU/UK Consent Mode v2 expects the tag present with denied defaults; waiting to load the script until Accept breaks cookieless pings and UTM attribution timing.

## [2026-09-27] Photo browser cells must not use `fill` + fixed aspect-ratio
- The “See all photos” modal mixed Next `Image fill` (Spaces) with in-flow `<img>` (Netlify/etc.) inside `aspect-ratio: 4/3` + `object-fit: cover` buttons. Absolute-fill children don’t contribute height; grid rows collapsed and photos overlapped.
- Browser cells use `fit="natural"` (`width: 100%; height: auto`) and `align-items: start`. Mosaic hero/thumbs still use `cover` + fill.
- Why it matters: External hosts skip the Next allowlist; uniform cover crop also hid each photo’s true ratio.
## [2026-09-27] Discovery card slot chips need restaurant TZ
- `RestaurantCard` takes optional `timeZone` and formats chips with `formatTimeInTimeZone` (fallback `PLATFORM_TIMEZONE`). Home + discovery landings pass `r.timezone` from SEARCH, else `timezoneFromAddress({ state })`. SEARCH / home seed selections include `timezone`.
- Why it matters: Bare `formatUsTime(slot)` followed the browser zone and showed wrong wall clocks for out-of-zone diners.

## [2026-09-24] Sticky booking form needs a viewport max-height
- `.rt-restaurant-profile__booking-sticky` is `position: sticky` with `top: header + section nav`. Without `max-height` + `overflow-y: auto`, a tall form (experience add-on, promo, gift card, …) pins with its CTA below the fold until page scroll reaches the footer.
- Cap with `max-height: calc(100dvh - var(--booking-sticky-top) - 16px)` and `overscroll-behavior: contain`. Reset to `static` / `max-height: none` at ≤992px (mobile uses the Book footer instead).
- Why it matters: Sticky without a height cap hides the primary booking action on laptop-height viewports.

## [2026-09-24] Details Reservations uses booking windows
- Header `RestaurantHoursMeta` and Details `bookingHoursLine` both use `formatBookingHours` (e.g. `11:30 AM–2:30 PM, 5:00 PM–10:00 PM`). Do not pass `formatShortHours` into Details — it collapses to earliest open → latest close and erases midday gaps.
- Why it matters: Diners read reservation windows, not “open all afternoon.”

## [2026-09-24] Profile section tabs are inventory-aware
- `RestaurantSectionNav` only shows **Experiences** when upcoming published experiences exist, and **Private dining** when active spaces exist (`?section=experiences|private-dining`).
- Private dining cards live in `RestaurantPrivateDiningSection`; **Book this room** clamps party size into the room’s min/max, selects the space, and scrolls to `#booking-form`.
- Availability / bookable-tables queries pass `privateDiningSpaceId` when a room is selected so the API uses that room’s backing table inventory.
- Why it matters: Don’t hardcode those tabs — empty restaurants must not show dead anchors. Large private rooms will show no times if the space id is omitted from availability.

## [2026-09-24] Hero search field contrast
- Stacked ≤940px fields used `--color-bg` (`#f7f5f2`) on a white card + tertiary labels — washed out.
- Fields now always use `#efece7` + `--color-border`, secondary labels, and brand focus ring; vertical dividers dropped (redundant with bordered cells).
- Why it matters: Mobile/tablet/laptop hero form readability without changing layout breakpoints.

## [2026-09-24] Restaurant gallery mirrors OpenTable
- Hero is a flush mosaic (1 / 2 / 3 / 5 slots) with a centered brand **See all N photos** pill — not a corner count badge.
- Flow is two-step: white photos browser modal (title + “Explore photos from …”) → fullscreen black lightbox; Escape/close returns to the browser.
- Lightbox is a `position: fixed` portal on `document.body` — Ant Design `Modal` + `100vh`/`100vw` was centering a tall dialog and shoving a black slab + images below the fold.
- Photos section reuses the same gallery via `openBrowser(index?)` ref — no duplicate lightbox state.
- Why it matters: Diners expect OT-style browse-then-zoom; corner “+N photos” overlays were easy to miss.

## [2026-09-24] Restaurant profile mobile mirrors the app
- ≤992px: booking Col `order: -1` (above overview), rounded sheet over the hero, sticky Book footer → `#booking-form` with highlight.
- Action row is Call / Directions / Website / Message tiles (not pill buttons).
- `/restaurants/` (+ `/r/`) are `rt-site-content--bleed` so Content padding does not leave `--color-bg` gutters beside the white profile.
- Why it matters: App profile keeps Book sticky and booking off-page; web keeps the form inline but surfaces it first + via footer.

## [2026-09-24] Reservation list overflow lives top-right
- More-actions (⋯) sits in `.rt-reservation-list-card__top-end` beside the status badge, not in the bottom actions row.
- Still hidden ≤640px with other inline actions so tap opens detail.
- Why it matters: Desktop cards no longer leave an orphan kebab under the meta well.

## [2026-09-24] Diner reservations mobile mirrors the app
- List: per-card layout (thumb + status + date/time/party meta well); inline actions hidden ≤640px so tap opens detail.
- Detail: centered top chrome + overflow, restaurant card, icon detail/extras rows, sticky primary CTA (pay / review / book again).
- Why it matters: Match `apps/mobile` reservations UX without a separate mobile route.

## [2026-09-23] Home SSR seed + discovery next/image
- Server `page.tsx` calls `fetchHomeSearchSeed` (default NYC + tomorrow + party 2, 60s revalidate). Client `useInfiniteRestaurantSearch` paints from seed when filters still match and refreshes with `cache-and-network`.
- `DiscoveryRestaurantCard` / map list / marker use `next/image` via `canUseNextImage` (shared allowlist with gallery).
- Why it matters: First home paint no longer waits on a cold client search; card LCP benefits from optimized images.

## [2026-09-23] Polls skip when the tab is hidden
- `skipPollWhenHidden` on AppShell notifications, waitlist, and messages. Apollo `BatchHttpLink` batches concurrent queries.
- Why it matters: Background diner tabs were still hitting `/graphql` every 5–60s.

## [2026-09-23] Restaurant page SSR seeds the client
- `fetchRestaurantSeo` loads the full detail selection (menu, bookingWindow, …). `RestaurantPageClient` paints from `initialRestaurant` and refreshes with `cache-and-network`. Stripe deposit UI is `next/dynamic` with `ssr: false`.
- Gallery hero/thumbs use `next/image` + `priority` for allowlisted CDNs; other hosts stay on `<img>`.
- Why it matters: Diners used to wait on a blank client island after SSR already had the restaurant.

## [2026-09-23] Search cards use availableSlotTimes
- Home, SEO landings, and map list/marker cards read `availableSlotTimes` from `searchRestaurants` — no per-card `AVAILABILITY` query.
- Why it matters: A 24-card grid used to be 25 GraphQL POSTs against the 100/min IP limit.

## [2026-09-23] Booking form reset after confirm
- `resetBookingForm` runs after successful `createReservation` / deposit confirm (not on the first “Complete reservation” click, which only opens the confirm modal).
- Must clear `occasion` from the URL in the same `syncBookingToUrl` call; otherwise the `?occasion=` effect re-applies the old occasion when booking params update.
- Why it matters: Success modal already snapshots labels; form can reset while the modal is open.

## [2026-09-23] Edit reservation Save stays disabled until dirty
- `EditReservationModal` tracks local `dirty` after load; Save is disabled until date/party/time/occasion/notes change.
- Why it matters: Same no-op-request guard as dashboard forms; load effect must reset dirty when the modal opens.

## [2026-09-23] Diner My reviews page
- Account dropdown / mobile nav → `/reviews`. Query `myReviews` returns the signed-in diner’s reviews (including own `hidden` ones) with `Review.restaurant`.
- Owner-reply inbox (`review_reply`) deep-links to `/reviews`, not the reservation detail.
- Why it matters: Don’t put My reviews on the partner DashShell account menu — that’s diner web only.

## [2026-10-03] CSP `maps: true` must allow Maps script hosts
- `securityHeaders({ maps: true })` used to only add Maps `frame-src`. Places Autocomplete still needs `script-src` (and connect) for `maps.googleapis.com` / `maps.gstatic.com`. Without those, `<script>` load fails while `fetch` of the same URL can return 200.
- Why it matters: Diner discovery address search and Partner Hub register/add-restaurant share `@reservations/ui` Google Places helpers.

## [2026-09-23] Local upload thumbs need same-origin or http API in CSP
- Review photos store `http://localhost:4000/api/uploads/local/...`. CSP `img-src ... https:` blocks those. Running Next often had CSP without the API origin even after `securityHeaders` added it (stale config eval).
- Fix: always allow `http://localhost:4000` / `127.0.0.1:4000` in img-src; rewrite `/api/uploads/local/*` to the API; render with `browserMediaUrl()` so thumbs use `'self'`.
- Why it matters: Don’t rely on absolute API http URLs in `<img>` under a https:-only CSP.

## [2026-09-23] PostVisitModal must not reset on reservationId clear
- After submit, `onCompleted` refetches; `reviewableReservation` / `reviewFor` becomes null while `open` stays true for the “Thanks” step. An effect keyed on `[open, reservationId]` then reset `step` to `'review'`.
- Reset only on open rising edge (`wasOpenRef`), not when `reservationId` changes while open.
- Why it matters: Don’t tie modal form reset to parent list identity after a successful mutation.

## [2026-09-23] Blog `bodyHtml` is not a trusted HTML document
- Admin TipTap posts were rendered with `dangerouslySetInnerHTML` and no sanitizer. `sanitizeBlogHtml` (`sanitize-html`) runs on GraphQL write (schema transform), `mapBlogPost` read, and the diner article page. Tags are TipTap-shaped; `a[href]` is http(s) only with `rel=noopener`.
- Next `headers()` add CSP (`object-src 'none'`, `frame-ancestors 'none'`). Script-src still includes `'unsafe-inline'` because Next/Antd/Stripe/GSI need it — sanitizer is the XSS control, CSP is defense in depth for plugins/objects. `img-src` includes the GraphQL API origin so local upload URLs on `http://localhost:4000` are not blocked.
- Why it matters: Never render CMS HTML raw. Don’t tighten `script-src` to `'self'` without Next nonces.

## [2026-10-03] Hero search bar control heights
- Antd large `Input`/`Select`/`DatePicker`/`AutoComplete` each render at different heights in `DiscoverySearchPanel`, and a `min-height` on the inner `.ant-input`/`.ant-select-content` stacks on top of the wrapper's 11–12px padding (58px controls). The panel pins wrappers to `height: 36px` (30px in `--map`) with zero block padding so labels line up.
- Why it matters: Add new search fields as `.rt-search-field` children so they pick up the `.rt-search-panel .rt-search-field` height rules, or the pill grows and labels misalign.


## [2026-10-07] Media CSP covers the uploads CDN
- three.js `GLTFLoader`/`TextureLoader` use `fetch`/XHR, so scan models and wall photos need `connect-src`, not just `img-src`. `securityHeaders.mjs` adds `*.digitaloceanspaces.com` + `NEXT_PUBLIC_MEDIA_CDN_URL` to `connect-src` and a `media-src` for `<video>`. Local uploads go through `browserMediaUrl` (same-origin rewrite).
- `VirtualRoomViewer` must be loaded with `next/dynamic` + `ssr: false` (WebGL / `window`).
- Why it matters: A CDN on a new host needs `NEXT_PUBLIC_MEDIA_CDN_URL` or the 3D room silently falls back to plain walls.

## [2026-10-09] Booking card: 3D CTA vs auto-assign
- When Virtual Room is shown and guest list selection is off, do not render the auto-assign Alert — `VirtualRoomTablePicker` with `selectionOptional` owns the fallback copy as secondary text under the CTA.
- Diner-paid fees: pass `dinerFeePreviewLabel` / `dinerFeeCentsForTable` / `selectedDinerFeeCents` from the page (built via `dinerVirtualRoomSelectionFeeTotalCents`). Hide when restaurant pays.
- Special requests: drop “seating preferences” from the placeholder when Virtual Room is on; point diners to the 3D CTA instead. Promo/gift inputs live in a collapsed “Have a promo or gift card?” panel so the card stays short; auto-applied promos stay visible above.
- Why it matters: Competing messages undercut the paid 3D table-selection path.
