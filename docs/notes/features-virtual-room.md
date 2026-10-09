# Virtual 3D room — Learnings & Observations

Experimental add-on: billing (monthly + per-guest fees) and an external photogrammetry provider (KIRI Engine), so it lives in its own file.

## [2026-10-09] Plan feature `threeDView` ≠ Virtual 3D add-on
- Admin → Pricing Features has a free package toggle `threeDView` ("3D view"). That is a plan entitlement (included when on), not `addons.virtualRoom3d`.
- Guest 3D table pick / editor / monthly add-on billing still use `featureFlags.virtualRoom3d` + `addons.virtualRoom3d` and require `floorPlans`.
- Why it matters: Do not treat enabling `threeDView` on a package as enabling the paid Virtual 3D product.

## [2026-10-09] Selection attempt counter is engagement, not bookings
- `VirtualRoom.selectionAttemptCount` increments via public `recordVirtualRoomSelectionAttempt` when a diner opens the 3D picker **after** choosing a time (explore-only opens do not count). Client dedupes with `sessionStorage` (`vr-selection-attempt:<restaurantId>`) like blog reads.
- Gate matches the public scene: published room + active add-on. Exposed on `VirtualRoomAddon` / `VirtualRoomEditor` for Partner Hub and Admin Package.
- Why it matters: Counts “tried 3D table pick” interest, not completed `tableSelectionSource: virtual_3d` reservations.

## [2026-10-09] Admin trial comps are per-restaurant, not platform price
- `adminSetVirtualRoomAddon` sets `addons.virtualRoom3d.trialPriceCents` / `trialEndsAt` / `trialDurationMonths` and optional `priceOverrideCents`. `syncVirtualRoomBilledMonths` and partner enable use `resolveVirtualRoomMonthPrice` (trial → override → platform).
- Saving also calls `ensurePeriodInvoiceForRestaurant` so the current UTC month invoice exists immediately (subscription plan lines + 3D trial/add-on line) and can email the owner.
- Why it matters: Setting global `virtualRoomPricing.monthlyPriceCents` to $0 comps everyone; admin trials are restaurant-scoped.

## [2026-10-09] Invoice pay saves preferred PM for auto-charge
- `startInvoicePayment` attaches the PI to `Subscription.stripeCustomerId` with `setup_future_usage=off_session`. `confirmInvoicePayment` stores `preferredPaymentMethodId` and keeps `autoChargeInvoices` on.
- Daily `generateDuePeriodInvoices` emails new unpaid invoices once (`emailSentAt`) then `autoChargeDueInvoices` off-session charges due invoices that have a preferred/default card.
- Why it matters: Internal period invoices (covers + 3D) are not Stripe Subscription invoices; without this path nothing auto-billed them.

## [2026-10-09] Optional 3D pick must not fight auto-assign copy
- With `allowGuestTableSelection: false`, list pick is hidden but 3D pick is still the revenue path. Showing “Choose your table in 3D” next to a firm “assigned automatically” alert contradicted itself and discouraged the fee-generating action.
- Fix: keep the strong CTA; replace the alert with muted “Optional — skip…” under the button (`selectionOptional`); only keep the auto-assign Alert when there is no virtual room at all.
- Why it matters: Auto-assign is the fallback, not the headline, when 3D selection is available.

## [2026-10-09] Show 3D fee only when the diner pays
- Guest UI prices use `dinerVirtualRoomSelectionFeeTotalCents` (0 for `restaurant` payer). Preview label is min across bookable selectable tables (`from $X` when amounts differ); selected/pending rows show the exact total.
- Why it matters: Confirm already listed diner-paid fees; pre-confirm silence caused surprise. Never surface restaurant-invoice fees to the diner.

## [2026-10-09] Ops scene is separate from the editor query
- `virtualRoomOpsScene` builds the same geometry as the partner preview (`buildVirtualRoomScene`) but only `find`s the VirtualRoom (no upsert) and allows any role with restaurant access, including hosts.
- Live floor passes status hexes via `tableColors` and sets `opsSelectMode` so staff can click tables that are not guest-selectable.
- Why it matters: Don’t reuse `virtualRoomEditor` on `/floor-ops` — hosts are blocked and the editor upserts a room doc on open.

## [2026-10-07] Add-on state lives outside plan features
- `featureFlags.virtualRoom3d` (platform kill switch, default off) gates everything. Per-restaurant opt-in is `Subscription.addons.virtualRoom3d`, not `features` — `getFeatures()` is recomputed from the plan and would wipe it.
- Eligibility = flag on AND plan has `floorPlans`. `syncVirtualRoomBilledMonths` re-checks `floorPlans` per subscription so a downgrade to Basic pauses billing without turning the add-on off.
- Why it matters: Don't add `virtualRoom3d` to `PlanFeatures`. UI copy promising "paused, not billed" depends on that per-subscription check.

## [2026-10-07] Monthly price is snapshotted per billed month
- `addons.virtualRoom3d.billedMonths[]` stores `{ period, priceCents }` the first time a month is billed (`$push` guarded by `billedMonths.period $ne period`, so concurrent syncs don't double-add). Invoices read the snapshot, not current `PlatformConfig.virtualRoomPricing`.
- Toggling calls `refreshPeriodInvoiceForRestaurant`, which only re-prices an existing refreshable auto-invoice for the current period; it never creates one.
- Why it matters: Admin price changes apply to future months only. Regenerating an old invoice must keep its locked price.

## [2026-10-07] Guest fee is decided at booking, charged at completion
- `createReservation` sets `tableSelectionSource: 'virtual_3d'` and `virtualRoomGuestFeeCents` only when the client sends `virtual_3d` AND `canSelectTableIn3d` (add-on active + room published). A 3D pick is allowed even with `allowGuestTableSelection: false`; a list pick is not.
- `virtualRoomGuestFeeCents` on the reservation is the per-guest price at booking time. Completion calls `recordVirtualRoomGuestFee`, which creates one `AddonFee` (unit × party size) per reservation; duplicate-key errors on re-completion are ignored. Invoices bill pending fees for the period and mark them charged.
- Why it matters: No-shows and cancellations never reach completion, so they are never billed. Don't move fee creation to booking time.

## [2026-10-07] Scene is derived from the published floor plan
- Areas, tables, fixtures, and outlines come from the published layout; `VirtualRoom` only stores media, per-area look (colors, ceiling height, panorama), publish state, and the scan. Grid `posX/posY` is the top-left corner, rotation pivots on the centre, CSS rotation is clockwise → three.js `rotation.y = -deg`.
- `metersPerCell` comes from `unitsPerCell` (× 0.3048 for ft). The viewer clamps it to 0.25–1.2 m because real layouts (e.g. dev demo: 2 m/cell) make tables absurdly large.
- A KIRI scan (GLB) is auto-fitted and only replaces the **first** area; other areas stay procedural. Load failure falls back to the procedural room.
- Why it matters: Layout edits must be published to show up in 3D. Multi-area scans need a per-area model field first.

## [2026-10-08] Walls must enclose the rotated footprint
- Room bounds and `floorRooms` polygons are the unrotated layout. A table rotates around its center, and chairs sit ~0.6 m past the top, so both swing through the wall.
- `fitRoomToFurniture` slides each crossed wall edge straight outward (a rectangle stays a rectangle) until the rotated top plus `SEAT_CLEARANCE_M` is inside. A table only grows the room its center sits in.
- Why it matters: Don't go back to building walls from `posX/posY/width/height` alone.

## [2026-10-08] Doors and windows cut the wall they sit on
- `window` is a floor fixture kind (shared enum, zod, mongoose). A door or window whose long side is parallel to a 3D wall and within `OPENING_SNAP_M` (1.75 m) becomes an opening in that wall. The same fixture is not also drawn as a block. Anything farther stays a freestanding frame.
- A `wall` fixture is a full-height divider in the room's wall color. It does not grow the outer room.
- Why it matters: The outer wall is outside the floor-plan edge (pad + chair clearance). A short snap distance leaves the doorway floating inside the room.
- `floorFixtureSchema` allows width/height down to 0.25. A window default is 0.4 deep; the old 0.5 minimum rejected the save.

## [2026-10-09] Selection fee payer is a platform setting
- `virtualRoomPricing.selectionFeePayer`: `restaurant` (default) | `diner` | `combined` | `diner_share`. Snapshotted on the reservation at booking.
- Restaurant: `recordVirtualRoomGuestFee` on completion → AddonFee on monthly invoice (unchanged).
- Diner: fee total is added to prepaid `depositAmountCents` at booking; confirm modal shows “3D table selection”; no AddonFee on completion.
- Combined: diner pays platform unit + restaurant unit at booking (`dinerVirtualRoomSelectionFeeTotalCents`); no AddonFee.
- Diner share: diner pays restaurant unit at booking; platform unit is AddonFee’d to the restaurant on completion (the cut). No restaurant unit → no cut (degenerates to diner-paid platform fee).
- Split snapshots: `virtualRoomGuestFeeCents` = platform unit for combined/diner_share; `virtualRoomRestaurantFeeCents` = restaurant unit. Classic modes keep a single resolved unit in `virtualRoomGuestFeeCents`.
- Why it matters: Switching payer mid-flight is safe per booking because the snapshot wins; old reservations without the field keep restaurant billing.

## [2026-10-09] Combined / diner_share need separate platform vs restaurant units
- Scene exposes `platformSelectionFeeUnitCents` and `restaurantSelectionFeeUnitCents` so the diner UI can preview combined totals without treating a restaurant override as the platform fee.
- Why it matters: `selectionFeeUnitCents` alone is the resolved (override-or-platform) amount and cannot express “platform $2 + restaurant $10”.

## [2026-10-09] Dashboard editor is preview-first, settings in tabs
- Partner Hub Virtual 3D room page: thin publish/refresh toolbar → full-width preview (taller viewport) → one Card with Tabs for Layout / Area look / Selection fee / Photos & video / 3D scan. Avoids a tall right column of cards leaving empty space beside the preview.
- Why it matters: Multi-area placement + fee + media controls stack vertically; tabs keep the preview dominant without a long scroll past unused gray.

## [2026-10-09] Layout edit mode gates floor drag
- Preview `placementEditable` is off until Edit layout. Orbit/zoom/pan stay available; floor drag and Layout-tab mode/sliders require edit mode. Done editing refuses while a placement draft is dirty (save or discard first).
- Why it matters: Left-drag on Overall was easy to mistake for orbit and accidentally move floors.

## [2026-10-09] Guest table labels are optional
- `VirtualRoomViewer.showTableLabels` (default true) skips the canvas sprites above tables. Diner picker defaults false and exposes a Names chrome button via `onShowTableLabelsChange`. Area labels in Overall stay; hover tooltip still has name + seats.
- Why it matters: Dense multi-area rooms overlap name chips and hide the furniture.

## [2026-10-08] Overall multi-area placement
- Floor areas still use independent 2D grids. Cross-area placement lives on `VirtualRoom.areaSettings` as `offsetXM/YM/ZM` (meters) plus `areaLayoutMode`: `stack` | `adjacent` | `custom`.
- `stack` / `adjacent` recompute offsets in `buildVirtualRoomScene` from bounds + wall height (gap `VIRTUAL_ROOM_AREA_GAP_M`). `custom` keeps saved offsets. Saving explicit offsets without a mode flips to `custom`.
- Viewer default for 2+ areas is `VIRTUAL_ROOM_OVERALL_VIEW` (`__overall__`): every area is drawn with its offsets, labeled, no panorama (conflicts). Segmented still focuses one area.
- Camera aims at campus mid-Y and allows pan past horizontal so stacks stay in frame. Partner Overall view: drag floors (Shift = vertical) → saves `custom` placements.
- Why it matters: Guests need the campus view (1st vs 2nd floor, hall vs private) before they pick a table.

## [2026-10-08] Selection fee: platform → restaurant → area → table
- Platform `virtualRoomPricing.perGuestFeeCents` is the **unit** amount (default $2); `selectionFeeMode` is `per_guest` (× party size) or `per_table` (flat). Restaurant can disable, override mode/cents, and set `applyTo` `all` | `selected`.
- Area settings: `guestSelectable` / `selectionFeeCharged` (default true) + optional `selectionFeeCents`. Table: `virtualRoomSelectable` (default true), `virtualRoomSelectionFeeEnabled` (opt-in for `selected`, opt-out for `all`), optional `virtualRoomSelectionFeeCents`.
- Resolution: `resolveVirtualRoomSelectionFee` (table → area → restaurant → platform). `isVirtualRoomTableSelectable` gates picks. Snapshot: `virtualRoomGuestFeeCents` + `virtualRoomSelectionFeeMode`.
- Why it matters: Invoice copy still says “N guests” when every fee is unit × party; otherwise “N table picks”.

## [2026-10-09] Hide video→3D for owners when KIRI unset
- `providerConfigured` (from `KIRI_ENGINE_API_KEY`) gates Partner Hub: without it, owners don't see Scan photos / Video uploads or the 3D scan tab. Super admins still see the tab (with a not-configured warning). If a prior scan exists, the tab stays so alignment / use-model remain reachable.
- Why it matters: Avoids pitching a dead-end upload flow when photogrammetry isn't wired on that environment.

## [2026-10-07] Reconstruction: lazy queue, re-hosted model
- `virtualRoomReconstruction.ts` creates the BullMQ queue on first use (`getQueue()`), so importing it (tests, resolvers) doesn't open Redis. Source = latest capture video, else 20–100 capture photos.
- Finished KIRI models are downloaded (zip unpacked with `fflate`) and re-uploaded to Spaces; the scene never points at KIRI URLs. Without `KIRI_ENGINE_API_KEY` the Generate button is disabled and the room is procedural + photos only.
- Media URLs must be our own uploads (`isOwnUploadUrl`); foreign URLs are rejected. The worker reads capture files back through `readOwnUpload`.
- Why it matters: KIRI download links expire. Don't loosen the own-upload check; the API fetches these URLs server-side.
