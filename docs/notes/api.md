# API — Learnings & Observations

## [2026-09-29] Stripe sandbox ↔ production mode
- `PlatformConfig.stripeMode` is `test` | `live` (unset → test outside production NODE_ENV, live in production). Super-admin only on `updatePlatformConfig`.
- Secrets: prefer `STRIPE_SECRET_KEY_TEST` / `_LIVE` (+ webhook + `STRIPE_PUBLISHABLE_KEY_*`). Legacy `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` fall back only when the key prefix matches the requested mode.
- `getStripe()` refreshes mode from Mongo (~5s TTL) and caches clients per mode. Webhooks try the active mode secret first, then the other.
- Public `stripeClientConfig` returns `{ mode, publishableKey }` so Elements match the API secret after a switch. Stored `cus_` / `sub_` / `pi_` IDs are not migrated across modes.
- Why it matters: Flipping live without live keys must fail closed; build-time `NEXT_PUBLIC_*` alone will mismatch after a mode switch.

## [2026-09-29] Manual invoice duplicate period override
- `createManualInvoice` conflicts when restaurant+period already has an invoice (`CONFLICT` + existing details). `forceCreate` + `duplicateJustification` proceeds; `replaceExisting` (default false) overwrites in place. Without replace: cancel the old invoice, rewrite its `billingPeriod` to `YYYY-MM~canceled-{number}` to free the unique index, then create a new number.
- Why it matters: Unique `{ restaurantId, billingPeriod }` blocks a second active invoice; don’t replace by default; canceled period keys won’t match period filters/lists.

## [2026-09-29] Platform `featureFlags.sms` gates Premium SMS
- Default on. Public `platformFeatureFlags` exposes kill switches. Non-admin `plans` strips `premiumSms` and SMS mentions from description/highlights when off; admins still see raw package features. `getFeatures` / `hasPremiumSms` / `SubscriptionType.features` / `setPremiumSmsAddon` all respect the flag. Does not affect auth OTP SMS.
- Why it matters: Partner Billing and package cards must not advertise SMS while the platform switch is off; stored add-on bits stay on the subscription for when SMS is re-enabled.

## [2026-09-29] `restaurantReviews` supports `ReviewSort`
- Optional `sort: ReviewSort` (`newest` | `oldest` | `highest` | `lowest`); default `newest` (`createdAt: -1`). Rating sorts break ties on newest.
- Why it matters: Profile preview (`limit: 5`) and the all-reviews modal must share the same ordering without client-side re-sort of a partial page.

## [2026-09-29] Open invoice counts for nav badges
- `countOpenInvoices(restaurantId?)` — status in upcoming/pending/overdue and `totalCents > 0`. Powers `restaurantOpenInvoiceCount`, `adminStats.openInvoices`, and `adminPendingRequestCounts.openInvoices`.
- `exportInvoicePdf` is auth + `assertRestaurantAccess` on the invoice’s restaurant (admins still pass). `restaurantInvoice(id)` is the partner detail query.
- Why it matters: Keep admin nav on the lightweight pending-counts query; don’t reintroduce a raw `Invoice.countDocuments` in resolvers; partners need PDF without admin role.

## [2026-09-29] Review report chat is two-way
- `respondToReviewReport` (admin) and `replyToReviewReport` (any owner/manager with venue access, or platform admin) both append `Review.reportResponses` while `flagged` is true. Partner replies notify the last non-reporter author when one exists.
- Stored `fromReporter` marks partner-side bubbles (fallback: authorId === flaggedById for older rows).
- Dismiss (`unflagReview`) sets `flagged: false` only — keeps reason, `flaggedById`, and chat history. Further admin/reporter messages fail with "This report was closed".
- Guests still get an empty `reportResponses` array.
- Why it matters: Chat UI needs opening report + both sides ordered by time; venue staff (not only the original filer) must be able to answer Tablevera; dismiss ends the conversation without wiping the thread.

## [2026-09-29] Review edit + Google-style reactions
- `updateReview` is author-only; replaces rating/qualities/comment/photos and calls `recomputePublicReviewStats`. Does not touch owner reply or report state.
- `reactToReview` stores one `ReviewReaction` per signed-in user (`reviewId`+`userId`) or per guest (`reviewId`+`visitorKey` from `X-Visitor-Key`). Auth is not required. Same reaction again deletes it. Own reviews rejected for signed-in authors only.
- Field resolvers batch `reactionCounts` / `myReaction` via loaders (user id preferred; else visitor key).
- Why it matters: Public cards must not count hidden reviews; reactions are separate from ratings and must not inflate `reviewCount`.

## [2026-09-29] Review report replies go to the reporter
- `respondToReviewReport` is admin-only. It appends `Review.reportResponses` (plain text plus image attachments) and notifies `flaggedById` with type `review_report_response`.
- `Review.reportResponses` is empty unless the viewer is a platform admin or has venue access. Dismissing a report (`unflagReview`) keeps `flaggedById` and reason fields so the closed thread stays readable.
- Why it matters: This is not the public owner reply. Guests querying `restaurantReviews` must not receive the moderation thread.

## [2026-09-29] Signup email verification gate is platform config
- `PlatformConfig.requireSignupEmailVerification` — unset means `NODE_ENV === 'production'`. Super admin only on `updatePlatformConfig`. `registerWithEmail` / `registerRestaurantPartner` set `emailVerified: !required` and send a 6-digit `email_verification` code (10 min) when required.
- `User.needsEmailVerification` is require-flag ∧ has email ∧ !verified. Mutations: `verifyEmail(code)` (auth required), `resendVerificationEmail`. Non-prod may return `devCode` when SendGrid is unset or `AUTH_DEV_OTP` (fixed `123456`).
- Why it matters: Local signups stay usable without a verify-email flow; production defaults to requiring verification once that flow exists.

## [2026-09-29] Public review stats exclude hidden reviews
- `recomputePublicReviewStats` aggregates reviews with `hidden: { $ne: true }` and writes `Restaurant.averageRating` / `reviewCount` (both 0 when none remain). Called from `createReview`, `deleteReview`, `setReviewHidden`, and `setReviewHiddenAdmin`.
- Why it matters: Hiding used to flip the flag only, so cards and the restaurant page still counted a review diners cannot see. A later create or delete would have put hidden reviews back into the stored totals.

## [2026-09-29] Package includes vs description draft
- `highlights` on a plan override is the public Includes list. Missing means `DEFAULT_PLAN_HIGHLIGHTS` for Basic/Core/Pro (and none for custom). A saved empty array stays empty.
- `generatePlanPackageDescription` is super-admin only. Gemini when `GEMINI_API_KEY` is set; otherwise `buildTemplatePlanDescription`.
- Why it matters: Don’t treat an omitted `highlights` field as “clear the list” — that would wipe the built-in bullets on every unrelated save.

## [2026-09-28] `deleteReview` is author or super admin
- Mutation permanently removes the Review, recomputes `Restaurant.averageRating` / `reviewCount` (zeros when none left), and calls `reverseReviewPoints` (idempotent adjust; swallows insufficient-balance).
- Auth: `dinerId` match, else `requireSuperAdmin` (not `requireAdmin`). Creators may delete while impersonated; super-admin path still blocks impersonation.
- Why it matters: Hiding stays a platform-admin moderation tool; permanent delete is narrower.

## [2026-09-28] Complete must not 500 on loyalty side effects
- `updateReservationStatus(..., 'completed')` saves the status even if visit points, restaurant loyalty, guest-profile recompute, or slot release throws. Those errors are logged. `$inc` on `loyaltyPoints` is avoided when the stored value is null (legacy users) — Mongo rejects `$inc` on null and production masks that as `INTERNAL_SERVER_ERROR`.
- Staff (owner/manager/admin) may complete from `pending` or `confirmed`. Diners still cannot skip seat → complete. Floor’s secondary Complete button uses that path.
- Why it matters: The Complete button was returning `{ message: "Internal server error" }` and leaving the visit open whenever a side effect threw.

## [2026-09-28] Pricing package order is `planOrder`
- Empty `PlatformConfig.planOrder` keeps built-ins first, then custom keys. `reorderPlanPackages` stores the full catalog key list. `getEffectivePlans` sorts with `orderPlans`; keys missing from the list stay at the end.
- Why it matters: Public `/pricing` used to re-sort to Basic, Core, Pro and ignore any admin order.

## [2026-09-28] Built-in plan delete is a catalog tombstone
- `deletePlanPackage` lets a super admin hide a built-in key via `PlatformConfig.deletedPlanKeys`. The code default and any `planOverrides` stay so `getEffectivePlan` still resolves restaurants already on that package.
- `getEffectivePlans` (pricing, signup, admin list) omits deleted keys. Custom packages are still removed by dropping the override, and any admin can do that. The last remaining catalog package cannot be deleted.
- Why it matters: Deleting Basic/Core/Pro must not wipe features for current subscribers, and must not reappear on the next config read because those keys live in `plans.ts`.

## [2026-09-27] Reservation attribution ≠ billing source
- `source` (network/website/widget/phone/walkin) drives cover fees. Marketing fields (`utmSource`/`utmMedium`/…, `landingPath`, `originUrl`, `referrer`) are separate.
- Diner create uses `resolveDinerReservationSource`: widget UTMs → `widget`; Google GBP UTMs stay `network` with `utmSource=google`.
- Why it matters: Don’t add `google` to the ReservationSource enum — that would break fee rules.

## [2026-09-27] Reservation emails carry full detail rows
- Merchant `notifyRestaurantManagers` builds HTML via `buildReservationAlertContent` (same fields as Telegram: guest, email, phone, table, occasion, special request, party, when) for `new_reservation` / update / cancel / needs-approval. Push/SMS keep the short one-liner; email gets the detail box + View reservation CTA.
- Diner `booking_confirmation` injects a runtime `{{detailBox}}` (name, email, address, date/time, party, occasion, table, add-ons, notes, deposit). ICS stays attached; don’t treat the attachment as the only place details live.
- Why it matters: Gmail showed “New reservation” as a single summary line while Telegram had the full guest sheet — partners thought details were “missing” or only in an attachment.

## [2026-09-27] External gallery/menu URLs (Netlify landings)
- Prod (`tablevera.online`) still had restaurant `photos` + menu `photoUrl` pointing at `restaurants-landings.netlify.app` (and some Google / venue-site / Uber CDN hosts). Import rehosts DoorDash/Uber only; Netlify landings were stored as raw strings.
- Rehost: `apps/api/scripts/rehost-external-images.ts` (dry-run default; `--apply`; optional `--slug=`). Needs prod `MONGODB_URI` + `DO_SPACES_*`.
- Why it matters: Hotlinked hosts break Next image allowlisting and can die if the landing site moves; gallery should be Spaces-only.
## [2026-09-27] Discovery time filter + reports are restaurant-zone
- `slotMatchesTime` must use `hmInTimeZone` + `restaurantTimeZone(r)`, not `Date#getHours` (host local). Pre-shift / custom reports use `calendarDayRange` / `zonedWallClockToUtc` and `$dateToString.timezone` — never `new Date(\`${date}T00:00:00\`)`.
- Why it matters: A LA 7pm slot is UTC 02:00 next day; host-local matching and midnight bounds skew discovery filters and day buckets when the API runs outside the venue zone.

## [2026-09-26] Restaurant name in Telegram body
- `buildReservationMessengerContent` prefixes `Restaurant: {name}` so multi-venue managers can tell bookings apart in one Telegram chat.
- Why it matters: one Elevaro link covers all venues for a user; without the name, Accept/Reject alerts looked identical.

## [2026-09-25] Multi Telegram per dashboard user
- Elevaro allows up to 2 Telegram chats per `platformUserId`. GraphQL `elevaroTelegramLinks` + create returns limit error when full. Dashboard Notifications shows N/2.
- Why it matters: Owners with two phones no longer need a second staff login; `/unlink` in a chat frees one slot.

## [2026-09-25] Elevaro Open URL must be detail path
- Messenger `openUrl` is `{DASHBOARD_APP_URL}/reservations/{reservationId}`. `?id=` was ignored by the list page (it only deep-links via `reservationId` or `/reservations/[id]`).
- Why it matters: Telegram Open must land on the booking, not the full list.

## [2026-09-25] Elevaro messenger copy owned by API
- `notifyRestaurantManagers` builds reservation alert `title`/`body`/`htmlBody` via `buildReservationAlertContent` (loads diner + tables) for email and Elevaro Telegram. Missing fields become `—`; cancel omits special request.
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

