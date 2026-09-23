# API — Learnings & Observations

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

