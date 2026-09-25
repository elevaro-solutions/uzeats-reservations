# API — Learnings & Observations

## [2026-09-25] Elevaro messenger copy owned by API
- `notifyRestaurantManagers` builds Telegram `title`/`body` for reservation events (loads diner + tables) and sends them as request overrides to Elevaro Notifier. Missing fields become `—`; cancel omits special request.
- Why it matters: Bot manifests are only fallbacks — changing Tablevera alert layout does not require a notifier redeploy.

## [2026-09-24] Manual deposit refund / hold release
- `refundReservationDeposit` is partner-or-admin only (same ownership check as status updates). Allowed when status is `authorized` (full hold only) or `captured` with remaining balance.
- Optional `amountCents` for partial refund of captured deposits; cumulative `depositRefundedCents` on the reservation; status stays `captured` until fully refunded.
- `refundDeposit` in Stripe: cancel PI when `requires_capture` (release hold); `refunds.create` with optional amount when `succeeded`. Stub `pi_dev_*` no-ops.
- Reverses deposit loyalty points only on full refund; notifies diner (`deposit_refunded` → `reservationUpdates` prefs).
- Webhooks `payment_intent.canceled` and `charge.refunded` call `syncDepositRefundedFromStripe` (idempotent; charge events pass `amount_refunded`).
- Why it matters: Calling `refunds.create` on an uncaptured manual-capture intent fails in live Stripe; Dashboard refunds need webhook sync so list status stays accurate.

## [2026-09-24] Experience minGuests
- `Experience.minGuests` defaults to 1 in Mongoose and `mapExperience` (`?? 1`). Create/update reject min > max; booking rejects partySize below min.
- Why it matters: Existing experiences without the field still book correctly; GraphQL exposes `minGuests: Int!`.

## [2026-09-24] Email is SendGrid-only
- Removed Resend fallback from `sendEmail` / env schema / shared env catalog. Without `SENDGRID_API_KEY`, sends stub as `[email:dev] stub`.
- Why it matters: Don’t set `RESEND_API_KEY` expecting delivery; production must configure SendGrid.

## [2026-09-23] Availability Redis TTL + shared Redis
- `getAvailabilityForRestaurants` caches per `restaurantId+date+partySize` for 45s (`avail:v1:*`). Skipped when tests inject `now`. `/health` pings `getSharedRedis()` instead of opening a new connection.
- Why it matters: Discovery and booking share the same compute; short TTL cuts repeat load without serving stale inventory for long.

## [2026-09-23] Discovery `$text` with `$near` demotion
- Multi-word free-text uses the Restaurant text index. Single-token queries stay case-insensitive regex (prefix UX: `sam` → Samarkand). `applyGeoToFilter` calls `demoteTextSearchToRegex` before attaching `$near` (Mongo forbids `$text` + `$near`). Landmark/`$geoWithin` paths keep `$text`.
- Why it matters: Near-me search with a query string must not 500; textScore sort only applies when `$text` remains.

## [2026-09-23] GraphQL HTTP batching (Apollo Server 4)
- AS4 has no built-in batching. `graphqlBatchMiddleware` handles array bodies before `expressMiddleware`, sharing one context. Cap 20 ops/batch.
- Why it matters: Without this, BatchHttpLink POSTs fail or are mis-parsed as a single invalid operation.

## [2026-09-23] Compound indexes for availability day queries
- Reservation: `{ restaurantId, slotStart, status }` partial on pending/confirmed/seated. Blackout: `{ restaurantId, date }`.
- Why it matters: `getAvailability` / batch path filter by restaurant + day overlap; single-field indexes alone degrade as bookings grow.

## [2026-09-23] Batched discovery availability
- `getAvailabilityForRestaurants` loads Blackout/Shift/Table/Reservation/Claims once for the candidate set. Lean reads on the batch path.
- Why it matters: Dated search used to be ~6 Mongo round-trips × N restaurants before cards could paint.

## [2026-09-23] Role `staff` → `manager`
- `UserRole` / mongoose enums / GraphQL use `manager` instead of `staff`. `migrateStaffRoleToManager` on API boot rewrites users, `staffinvites` rows, and `PlatformConfig.defaultStaffRole` → `defaultManagerRole`.
- GraphQL ops: `inviteManager`, `acceptManagerInvite`, `managerInviteByToken`. Email template key stays `staff_invite` for existing DB templates.
- Why it matters: JWT `role` claims and client caches must use `manager` after deploy; keep `account_manager` distinct.

## [2026-09-23] Package manager seats gate owner invites
- `PlanInfo.managerSeats` (and plan overrides) is a numeric quota, not a feature flag. Builtin defaults: basic=1, core=3, pro=5; `normalizeManagerSeats` enforces ≥1.
- Seats count `manager` users with the venue in `restaurantIds`. Primary `Restaurant.ownerId` does not consume a seat. `dedicatedSupport` remains Pro platform support, unrelated to seats.
- `inviteManager` / `assignUserToRestaurants` / `adminCreateUser(manager)` call `assertManagerSeatsAvailable`. Owners may invite/remove only `manager` on venues they own (`canManageTeam`); admins unchanged.
- `restaurantManagerSeats(restaurantId)` returns limit/used/pending/remaining from the live effective plan (upgrades apply immediately).
- Invite links use `DASHBOARD_APP_URL/accept-invite?token=…`. Public `managerInviteByToken` + `acceptManagerInvite` set password, mark accepted, and set dashboard auth cookies. Web `/accept-invite` redirects for older emails that pointed at `WEB_APP_URL`.
- Why it matters: Don’t store seats only on frozen subscription.features — resolve from `getEffectivePlan(sub.plan)`. Don’t point manager invites at the diner web app without a redirect.

## [2026-09-23] New reviews notify managers; unreplied count for sider
- `createReview` calls `notifyRestaurantManagers` with type `new_review` (prefs: `newReview`). Payload includes `reviewId` / `reservationId`; `restaurantId` is added by the helper.
- `restaurantUnrepliedReviewCount(restaurantId)` counts non-hidden reviews with empty/missing `ownerReply` (partner access required).
- `myReviews` lists the signed-in diner’s reviews (includes hidden); `Review.restaurant` resolves the venue.
- Why it matters: Don’t reuse diner `review_reply` prefs for owner alerts. Badge query is venue-scoped like pending profile requests.

## [2026-09-23] Platform reservation ops use `isPlatformAdmin`, not `role === 'admin'`
- `updateReservationStatus`, `updateReservationDetails`, and `deleteReservation` already used `isPlatformAdmin`. `seatReservationAtTable` wrongly checked `user?.role === 'admin'`, so `super_admin` / `account_manager` got Forbidden when seating at a table.
- Why it matters: Never gate platform ops on the literal `'admin'` string — use `isPlatformAdmin` from `@reservations/shared`.

## [2026-09-23] Owner review reports are moderation queues, not hide
- `reportReview(reviewId, reason, details?)` requires venue access. Reasons live in shared `REVIEW_REPORT_REASONS` (spam, conflict_of_interest, off_topic, hate_or_harassment, private_information, legal_or_policy, other). `other` needs ≥10 chars of details. Sets `flagged` + structured fields; does **not** set `hidden`.
- Partner `setReviewHidden` now `requireAdmin` only (same trust model as Google/Yelp). Admin queue is `flaggedContent` → Dismiss / Hide / Hide & clear; detail via `flaggedContentItem(id, type)`.
- `pendingFlaggedContentCount` feeds `adminPendingRequestCounts.moderationItems` and `adminStats.pendingModerationItems`.
- Why it matters: Don’t re-expose partner hide for “bad rating.” Reply is the reputation tool; report is for policy violations.

## [2026-09-23] Import image fetch must re-validate every hop
- `POST /api/import-restaurant/upload-image` used `fetch()` with default redirect follow and a `cloudfront.net` suffix allowlist. A CloudFront URL can 302 to `169.254.169.254`. `fetchAllowedImage` now uses `redirect: "manual"`, re-runs host + DNS private-IP checks on `Location`, HTTPS-only, and sniffs magic bytes (JPEG/PNG/WebP/GIF). Diners get 403 (`canImportRestaurant`).
- Magnific stock download uses the same helper with Freepik/Magnific hosts.
- Why it matters: Do not call `fetch(url)` for partner-supplied URLs without hop checks. Wildcard CloudFront is only safe if the final URL is re-allowlisted.

