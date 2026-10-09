# API — Learnings & Observations

## [2026-10-09] Virtual 3D selectionAttemptCount
- `VirtualRoom.selectionAttemptCount` + public mutation `recordVirtualRoomSelectionAttempt`. `$inc` only when published + add-on active (same gate as `getPublicVirtualRoom`). Returns updated `VirtualRoomAddon` or null.
- Why it matters: Unauthenticated best-effort analytics; invalid ids / unpublished / inactive are silent no-ops.

## [2026-10-09] Post-visit review-request email (campaigns-gated)
- On `completed`, `scheduleReviewRequestEmail` enqueues BullMQ `reminders` job `review-request` when platform `featureFlags.campaigns` and plan `emailCampaigns` are on. Timing: 10:00 local, first morning ≥12h after `slotEnd` (`computeReviewRequestSendAt`).
- Worker calls `sendReviewRequestEmail` (skips if already reviewed / not reviewable / campaigns off). Template key `review_request`. Manual path: `askGuestReview` sends immediately for the guest’s latest unreviewed visit.
- Why it matters: Don’t fire with survey invites on complete — surveys are immediate; reviews wait for morning-after open rates.

## [2026-10-09] Cancel / no-show period hierarchy
- Fields: `PlatformConfig.cancellationPeriodHours` (default 24), optional overrides on Restaurant / Table / Experience / PrivateDiningSpace, snapshot on Reservation.
- Resolve with `resolveCancellationPeriodHours([experience, privateDining, table, restaurant, platform])`. `Restaurant.effectiveCancellationPeriodHours` field resolver merges restaurant + platform for diner UI.
- Diner late-cancel in `updateReservationStatus` uses the reservation snapshot, not live config.
- Why it matters: Changing platform/restaurant hours must not reopen or close an already-booked cancel window.

## [2026-10-09] Reservation confirmationNumber is a stored 6-digit code
- New bookings get `confirmationNumber` (`100000`–`999999`, unique sparse index) via `generateReservationConfirmationNumber`. GraphQL `Reservation.confirmationNumber` falls back to the old last-8 ObjectId slice for legacy rows.
- Partner/admin list `search` matches confirmation # (exact 6 digits skips date-period filters). `restaurantReservation(id)` accepts Mongo id or confirmation #.
- Why it matters: Don’t derive guest-facing refs from `_id` in new UI; URLs stay `/reservations/:mongoId`.

## [2026-10-09] `virtualRoomOpsScene` for Live floor
- Read-only scene for `/floor-ops` 3D: `assertRestaurantAccess` (hosts OK), `VirtualRoom.findOne` + `buildVirtualRoomScene` — no upsert, no add-on gate.
- Why it matters: `virtualRoomEditor` requires manager+ and creates a room doc; ops must not.

## [2026-10-08] GraphQL “not responding” = API hung before `listen` (Mongo write concern)
- Symptom: web/dashboard up, `localhost:4000/graphql` connection refused. `tsx watch` process idle in the event loop; Mongo/Redis sockets open; never logs `[api] GraphQL ready`.
- Cause: Docker `rs0` single-node replica set stuck waiting on write concern (`waitForWriteConcernDurationMillis` growing on `create` / `updateMany`). Seen after wall-clock jumped backward so `lastDurableWallTime` was ahead of host time — ~100+ ops piled up and boot never passed `migrateStaffRoleToManager` / model index creates.
- Fix: `docker restart reservations-mongo-1`, then restart/touch the API so tsx reloads. Confirm with `POST /graphql { __typename }` and `/health`.
- Why it matters: Looks like a GraphQL/schema bug; it’s infra. Check `currentOp` for write-concern waits before digging into resolvers.

## [2026-10-06] Private dining availability needs `privateDiningSpaceId`
- Regular `availability(partySize)` ignores private-room inventory (`privateDiningOnly` tables). Pass `privateDiningSpaceId` so the API ensures a backing table and returns slots for that room’s guest range.
- Why it matters: Selecting Private room on the diner form without this arg showed “No available times” whenever min guests exceeded every normal table.

## [2026-10-06] No-show fee charge list is reservation-scoped
- `listNoShowFeeCharges` (`noShowFeeCharges.ts`) matches bookings with `noShowFeeCents > 0` and card-guarantee activity (`charged` / `refunded` / `failed`, or no-show still `card_saved` = pending). Summary aggregates ignore the feeStatus filter so cards stay global for the scope.
- Date range uses `noShowFeeChargedAt` (not slotStart). Combining search `$or` with activity `$or` must go through `$and` or Mongo overwrites one clause. Scope `restaurantId` as ObjectId — `find` casts strings, aggregate `$match` does not, so summary cards would stay at zero.
- Why it matters: Partner and admin fee reports (`restaurantNoShowFeeCharges` / `adminNoShowFeeCharges`) depend on this; do not reuse `restaurantReservations` slot-date periods for “when the fee was collected.”

## [2026-10-09] Reservation confirmationNumber is a stored 6-digit code
- New bookings get `confirmationNumber` (`100000`–`999999`, unique sparse index) via `generateReservationConfirmationNumber`. GraphQL `Reservation.confirmationNumber` falls back to the old last-8 ObjectId slice for legacy rows.
- Partner/admin list `search` matches confirmation # (exact 6 digits skips date-period filters). `restaurantReservation(id)` accepts Mongo id or confirmation #.
- Why it matters: Don’t derive guest-facing refs from `_id` in new UI; URLs stay `/reservations/:mongoId`.

## [2026-10-06] createReservation must not await SendGrid / template sync
- Party-of-6 at Diyor Choyxona 30 auto-assigns table DC3-4 (table deposit) → card-guarantee SetupIntent, then after pay `confirmDeposit` used to `await` `booking_pending` render + SendGrid. `getEmailTemplate` called `ensureDefaultEmailTemplates()` (two writes per built-in template) on every send, so the GraphQL mutation stayed open until Mongo + SendGrid finished — looks hung in the browser with no `[graphql] request` log until `res.finish`.
- Fix: look up the template first; only seed defaults if missing. Fire-and-forget reminder/email after the booking is saved. SendGrid `AbortSignal.timeout(15s)`; Stripe SDK `timeout: 20s`.
- Why it matters: Diners with a real email (not `*.local`) and a SendGrid key hit this on every booking confirmation/request mail. Retrying the same diner/restaurant/slot then hits the duplicate-reservation guard.

## [2026-10-06] Booking emails are templates with a reservation button
- Diner booking mail is `booking_confirmation`, `booking_pending`, `booking_updated`, `booking_reminder`, `booking_reminder_late`, `booking_cancelled`, `deposit_refunded`, `no_show_fee_charged`, and `no_show_fee_refunded`. Each default body includes `{{reservationUrl}}` (confirmation also has `{{calendarUrl}}`).
- `appendEmailButtonsIfMissing` adds the button only when the saved HTML does not already contain that URL, so an older customized template still gets a link and a current one is not doubled.
- Why it matters: Admin → Templates is the source. Restart the API so `ensureDefaultEmailTemplates` inserts new keys. A template an admin already saved is left as-is.

## [2026-10-06] Reminder emails come from templates
- 24h uses `booking_reminder`. Closer reminders (≤2h) use `booking_reminder_late` (I'm running late → `/reservations/:id?runningLate=1`, I'm on time → the reservation page). Both include `{{reservationUrl}}`.
- The worker still sends the short one-liner on push, SMS, and the inbox. Email subject/body come from the template (`emailSubject` / `emailText` / `htmlBody`). If the saved template cannot be loaded, the built-in default is sent.
- Uncustomized templates (`updatedById` unset) are overwritten on API boot. An admin edit sticks.
- Why it matters: `notifyUser` `title` and `body` are shared across channels. Don't put the template subject on the push notification.

## [2026-10-03] Waitlist partner edit
- `updateWaitlistEntry` edits waiting|notified entries (name/phone/party/quoted wait/`dinerId`; null unlinks). Reuses `resolveWalkInGuestFields`; duplicate active diner on the same date is rejected.
- Why it matters: Status transitions alone couldn’t fix a wrong party size or quote after add.

## [2026-10-03] Waitlist convert, expire cascade, seat → reservation
- `createReservation` soft-fails into `markWaitlistBookedForReservation` (same diner/restaurant/date, waiting|notified → `booked` + `reservationId`).
- Cancel/no-show and the minute BullMQ job (`waitlistJobs`) call `notifyNextWaitlistForSlot` / `expireStaleNotifiedWaitlistEntries` (`WAITLIST_NOTIFY_HOLD_MINUTES` = 15). Walk-ins get SMS on auto-notify when premium SMS is on.
- Partner `updateWaitlistStatus(seated)` creates a walk-in reservation via `createOwnerReservation` (optional `tableId`, optional waitlist `dinerId`). Transitions are validated with `canPartnerTransitionWaitlist`.
- Why it matters: Docs’ convert/expire loop is now real; Seat is not a status-only noop.

## [2026-10-03] Waitlist overdue host alerts
- GraphQL exposes `waitingMinutes` / `promisedWaitMinutes` / `isOverdue` (quoted → ETA → 45m default). Minute job `notify-overdue` alerts managers via `waitlist_overdue` (pref key `newReservation`) and stamps `overdueNotifiedAt` (re-alert every 15m).
- Why it matters: Quote a wait on walk-in add so overdue fires against the promise, not only the 45m default.

## [2026-09-30] Seed reservation slots use venue zonedWallClockToUtc
- `seed.ts` `atOffset` / `slot` / `dateStr` build wall clocks via `zonedWallClockToUtc` + `todayIsoInTimeZone(PLATFORM_TIMEZONE)` — not host `Date#setHours`.
- Why it matters: Reseeding on an Asia/Tashkent API host used to persist “19:00 local” as wrong UTC instants vs US Eastern venues.

## [2026-10-02] Billing / Stripe / Telegram must use AppError (or formatStripeError)
- Production `formatError` only preserves `AppError`, Zod, and Mongoose messages. Plain `Error` from `createSubscription`, `changePlan`, invoice pay-by-token, and Elevaro Telegram link paths showed as "Internal server error".
- Stripe SDK failures are mapped via `formatStripeError` in `formatError` (and services throw `AppError` / `ValidationError` where we control the throw). Telegram link-limit / upstream failures use dedicated `AppError` subclasses in `elevaroNotifier.ts`.
- Why it matters: Owners hitting trial start, plan upgrade, invoice pay links, or Connect Telegram need the real message; prod logs alone are not enough for the UI.

## [2026-10-01] Reservation reminder offsets are minutes + late-check category
- `scheduleReservationReminders` uses `REMINDER_OFFSETS_MINUTES` job ids `reminder-{id}-{minutes}m` (also removes legacy `*h`). Worker accepts legacy `{ hours }` payloads.
- Closer reminders pass `pushCategoryId: reservation_reminder_late` into `notifyUser` → Expo `categoryId` / web-push payload. `reportRunningLate` is diner-only and reuses the Message + manager notify path (no plan gate).
- Why it matters: Reschedule on slot edit or guests get reminders for the old time; category must be registered on the device before Yes/No appear.

## [2026-10-01] Host shares manager team seats
- `countManagerSeatsUsed` / pending invites / `wouldConsumeManagerSeat` include `host` with `manager`. Owners may invite `manager` or `host`; seat error copy says “team seats (managers and hosts)”.
- GraphQL `UserRole` enum and User/ManagerInvite mongoose enums include `host`. Support ticket resolvers allow host.
- Why it matters: Creating a host without a free seat must fail the same way as a second manager on Basic.

## [2026-10-01] `twoWayMessaging` gates restaurant sends only
- `sendMessage` used to call `requireFeature(restaurantId, "twoWayMessaging")` for both diner and restaurant senders. Diners on a Basic venue saw partner upgrade copy ("…not included in your current plan. Upgrade to unlock it.").
- Guests may always send about their reservation; only `senderType === "restaurant"` requires Core+.
- Why it matters: Plan upgrade language is partner-facing; guest Message UI must not surface it.

## [2026-10-01] AppError `details.field` for form mapping
- `ConflictError` / `ValidationError` / `AuthenticationError` can pass `{ field: 'email' }` (etc.); `formatError` spreads `details` into GraphQL `extensions`. Register duplicate email → `field: 'email'`; partner name conflict → `field: 'name'`; invalid credentials → `field: 'password'`.
- Why it matters: Clients show the message under the input without regex-only heuristics (heuristics remain as fallback).

## [2026-09-30] GraphQL SDL rejects `/** */` / `//` comments
- `apps/api/src/graphql/typeDefs.ts` is raw GraphQL SDL in a template string. Only `#` line comments and `"""` descriptions are valid — JSDoc `/** … */` (used in the Stripe mode fields) makes Apollo fail at boot with `Unexpected character: "/"`.
- Why it matters: A bad comment takes down the whole API; CI/typecheck does not parse the SDL string.

## [2026-09-30] Register duplicate email must use AppError
- Production `formatError` only preserves `AppError` / Zod / Mongoose messages; plain `throw new Error('Email already registered')` became `"Internal server error"`.
- `registerWithEmail` and `registerRestaurantPartner` now use `ConflictError` / `ForbiddenError` / `ValidationError` for user-facing registration failures.
- Why it matters: Clients already remap `Email already registered`; they only showed a generic 500 because the API masked it in production.

## [2026-09-30] SendGrid attachment `type` must be parameter-free
- SendGrid rejects `attachments[].type` values containing `;` (e.g. `text/calendar; charset=utf-8`). That silently failed every booking confirmation email that attached `reservation.ics` while the booking itself succeeded.
- `sendViaSendGrid` now takes only the MIME type before the first `;`. Prefer bare types at the call site (`text/calendar`, `application/pdf`).
- Why it matters: Notification rows show `status: failed` with a SendGrid 400; don’t re-test delivery without fixing the type.

## [2026-09-30] Loyalty transactions need a replica set (or a fallback)
- `withOptionalTransaction` (`lib/mongoTransaction.ts`) wraps platform + restaurant loyalty writes. Replica-set / mongos use `session.withTransaction`; standalone Mongo (Dokku prod) throws `IllegalOperation` / code 20 (“Transaction numbers are only allowed…”). We cache that and retry without a session.
- `createReview` soft-fails `awardReviewPoints` (log only) so a points failure cannot 500 after the Review row is already inserted — same pattern as complete-status loyalty awards.
- Plain `throw new Error("Already reviewed")` was masked as `INTERNAL_SERVER_ERROR` in production `formatError`; createReview now uses `ConflictError` / `NotFoundError` / `ValidationError`.
- Why it matters: First createReview attempt wrote the review then crashed on points; retry looked like a mysterious 500 (`Already reviewed`).

## [2026-10-09] Orphan Stripe subscription IDs after mode switch
- `mySubscription` used to call `getOpenSubscriptionPayment` and surface `resource_missing` (`No such subscription: 'sub_…'`) when Mongo still pointed at a `sub_` from the other Stripe mode. GraphQL nulled the field, Billing showed the plan picker, then `createSubscription` hit `Subscription already exists`.
- Fix: `getOpenSubscriptionPayment` returns `{ missing: true }` on `resource_missing`; `mySubscription` clears `stripeSubscriptionId` / customer / preferred PM, marks cancelled, returns null. `createRestaurantSubscription` replaces cancelled or Stripe-missing locals instead of Conflict. `cancelStripeSubscription` treats missing as already cancelled.
- Why it matters: Admin sandbox ↔ live flips leave unusable `sub_` / `cus_` ids; partners must be able to Start trial again under the active mode.

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

## [2026-10-01] verifyEmail wrong code must be ValidationError
- `verifyEmailCode` used plain `Error` for bad/expired/missing codes. Production `formatError` masks non-`AppError` as "Internal server error", so the UI showed that instead of "Invalid or expired verification code".
- Fix: throw `ValidationError` for those cases (same pattern as signup duplicate-email).
- Why it matters: User-facing auth validation must use `AppError` subclasses or production hides the real message.

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


## [2026-10-05] Tests must not see Stripe keys from `apps/api/.env`
- `config/env.ts` lets non-empty `apps/api/.env` values override `process.env`. That re-enabled `STRIPE_SECRET_KEY_TEST`/`_LIVE` after `__tests__/setup.ts` blanked them, so the suite created real Stripe test-mode intents. Bookings then stayed `pending` instead of using the `pi_dev_` / `seti_dev_` stubs.
- Under `NODE_ENV=test` the loader now skips keys already set in `process.env`, and setup blanks all three Stripe secret keys.
- Why it matters: Blank any new per-mode secret in `setup.ts` too, or a local `.env` will make tests depend on network and account state.

## [2026-10-09] Blog `readCount` is atomic and published-only
- `BlogPost.readCount` defaults to 0. Public `recordBlogPostRead(slug)` uses `findOneAndUpdate` + `$inc` with `status: 'published'` (draft/archived/missing → null). Admin `adminTopBlogPosts` sorts published posts by `readCount` desc; `adminBlogReadStats` sums all posts.
- Why it matters: Never trust client-sent counts. Keep increments atomic so concurrent readers do not race.

## [2026-10-07] `/api/uploads/video` must mount before `/api/uploads`
- `videoUploadsRouter` (250 MB, MP4/MOV/WebM) is registered ahead of `uploadsRouter` in `index.ts`. The `/api/uploads` mount's 10 MB `express.raw` parser would otherwise reject videos first.
- `getPlatformConfig` races on a fresh DB (parallel first requests both `create`). It now catches 11000 and re-reads.
- Why it matters: Keep the more specific upload route first. Any new singleton "find or create" needs the same duplicate-key fallback.
