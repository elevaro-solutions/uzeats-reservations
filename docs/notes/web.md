# Web — Learnings & Observations

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
- Why it matters: App profile keeps Book sticky and booking off-page; web keeps the form inline but surfaces it first + via footer.

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

