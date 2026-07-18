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
    depositAmountCents: { type: Number, default: 0 },
    stripePaymentIntentId: { type: String },
    depositStatus: {
      type: String,
      enum: ['none', 'requires_payment', 'authorized', 'captured', 'refunded', 'failed'],
      default: 'none',
    },
    loyaltyPointsEarned: { type: Number, default: 0 },
    loyaltyPointsRedeemed: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ['network', 'website', 'widget', 'phone', 'walkin'],
      default: 'network',
    },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    // POS-reported check total for this visit
    totalSpendCents: { type: Number, default: 0 },
    // Boost campaign attribution (network covers while a boost is active)
    boostCampaignId: { type: Schema.Types.ObjectId, ref: 'BoostCampaign' },
  },
  { timestamps: true },
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
