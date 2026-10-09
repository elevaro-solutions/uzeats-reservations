import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const reservationSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    dinerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tableIds: [{ type: Schema.Types.ObjectId, ref: 'Table', required: true }],
    partySize: { type: Number, required: true, min: 1 },
    slotStart: { type: Date, required: true, index: true },
    slotEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'],
      default: 'pending',
      index: true,
    },
    occasion: {
      type: String,
      enum: ['none', 'birthday', 'anniversary', 'business', 'date', 'celebration', 'other'],
      default: 'none',
    },
    guestNotes: { type: String, default: '' },
    packageId: { type: Schema.Types.ObjectId, ref: 'RestaurantPackage' },
    packageTitle: { type: String },
    packagePriceCents: { type: Number, default: 0 },
    privateDiningSpaceId: { type: Schema.Types.ObjectId, ref: 'PrivateDiningSpace' },
    privateDiningSpaceName: { type: String },
    privateDiningPriceCents: { type: Number, default: 0 },
    experienceId: { type: Schema.Types.ObjectId, ref: 'Experience' },
    experienceTitle: { type: String },
    experiencePriceCents: { type: Number, default: 0 },
    experienceTicketQty: { type: Number, default: 0 },
    /** Amount charged at booking (prepaid deposit + add-ons, after discounts). */
    depositAmountCents: { type: Number, default: 0 },
    /** Cumulative cents refunded against a captured deposit (0 until first refund). */
    depositRefundedCents: { type: Number, default: 0 },
    stripePaymentIntentId: { type: String, index: true, sparse: true },
    /** `authorized` = legacy manual-capture hold; new prepayments go straight to `captured`. */
    depositStatus: {
      type: String,
      enum: ['none', 'requires_payment', 'authorized', 'captured', 'refunded', 'failed'],
      default: 'none',
    },

    /**
     * Hours before slot start when free cancel ended for this booking
     * (snapshot of experience → private dining → table → restaurant → platform → 24).
     */
    cancellationPeriodHours: { type: Number, default: 24, min: 1, max: 720 },
    /** No-show / late-cancel fee guaranteed by a saved card; charged off-session only when it applies. */
    noShowFeeCents: { type: Number, default: 0 },
    cardGuaranteeStatus: {
      type: String,
      enum: ['none', 'requires_card', 'card_saved', 'released', 'charged', 'failed', 'refunded'],
      default: 'none',
    },
    stripeCustomerId: { type: String },
    stripeSetupIntentId: { type: String, index: true, sparse: true },
    stripePaymentMethodId: { type: String },
    noShowFeePaymentIntentId: { type: String, index: true, sparse: true },
    noShowFeeChargedAt: { type: Date },
    noShowFeeReason: { type: String, enum: ['no_show', 'late_cancel'] },
    /** Stripe decline / authentication message when the off-session charge fails. */
    noShowFeeError: { type: String },
    /** True when this booking stays pending until restaurant staff confirms. */
    requiresManualApproval: { type: Boolean, default: false },

    loyaltyPointsEarned: { type: Number, default: 0 },
    loyaltyPointsRedeemed: { type: Number, default: 0 },
    restaurantLoyaltyPointsEarned: { type: Number, default: 0 },
    restaurantLoyaltyPointsRedeemed: { type: Number, default: 0 },
    promotionId: { type: Schema.Types.ObjectId, ref: 'Promotion' },
    promoDiscountCents: { type: Number, default: 0 },
    giftCardId: { type: Schema.Types.ObjectId, ref: 'GiftCard' },
    giftCardDiscountCents: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ['network', 'website', 'widget', 'phone', 'walkin'],
      default: 'network',
    },
    // Marketing attribution (UTMs / landing) — independent of billing `source`
    utmSource: { type: String, maxlength: 100 },
    utmMedium: { type: String, maxlength: 100 },
    utmCampaign: { type: String, maxlength: 100 },
    utmContent: { type: String, maxlength: 100 },
    utmTerm: { type: String, maxlength: 100 },
    landingPath: { type: String, maxlength: 500 },
    originUrl: { type: String, maxlength: 1000 },
    referrer: { type: String, maxlength: 1000 },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    // POS-reported check total for this visit
    totalSpendCents: { type: Number, default: 0 },
    // Boost campaign attribution (network covers while a boost is active)
    boostCampaignId: { type: Schema.Types.ObjectId, ref: 'BoostCampaign' },
    /** Unset = auto-assigned or staff-booked. */
    tableSelectionSource: { type: String, enum: ['list', 'virtual_3d'] },
    /**
     * Unit 3D selection fee locked in at booking.
     * - restaurant / diner: resolved unit (platform → restaurant → area → table)
     * - combined / diner_share: platform unit (restaurant unit in virtualRoomRestaurantFeeCents)
     * Restaurant / diner_share: billed on completion. Diner / combined: in deposit at booking.
     */
    virtualRoomGuestFeeCents: { type: Number, default: 0 },
    /**
     * Restaurant-set unit fee snapshot for combined / diner_share payers.
     * Unset for restaurant / diner modes (folded into virtualRoomGuestFeeCents).
     */
    virtualRoomRestaurantFeeCents: { type: Number, default: 0 },
    virtualRoomSelectionFeeMode: {
      type: String,
      enum: ['per_guest', 'per_table'],
      default: 'per_guest',
    },
    virtualRoomSelectionFeePayer: {
      type: String,
      enum: ['restaurant', 'diner', 'combined', 'diner_share'],
      default: 'restaurant',
    },
    seatedAt: { type: Date },
    /** Guest-facing 6-digit confirmation; unique when set (sparse for legacy rows). */
    confirmationNumber: { type: String, sparse: true, unique: true },
  },
  { timestamps: true },
);

// Day-overlap queries: restaurant + time window + active statuses.
reservationSchema.index(
  { restaurantId: 1, slotStart: 1, status: 1 },
  {
    partialFilterExpression: {
      status: { $in: ['pending', 'confirmed', 'seated'] },
    },
  },
);

// Query helper for active bookings. Overlap exclusion is enforced by TableSlotClaim.
reservationSchema.index(
  { tableIds: 1, slotStart: 1, status: 1 },
  {
    partialFilterExpression: {
      status: { $in: ['pending', 'confirmed', 'seated'] },
    },
  },
);

export type ReservationDocument = InferSchemaType<typeof reservationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Reservation: Model<ReservationDocument> =
  mongoose.models.Reservation ??
  mongoose.model<ReservationDocument>('Reservation', reservationSchema);
