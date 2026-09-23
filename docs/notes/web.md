# Web — Learnings & Observations

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

