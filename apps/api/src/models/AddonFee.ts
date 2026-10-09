import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

/** Per-guest usage fees for paid add-ons, rolled into the monthly invoice like cover fees. */
const addonFeeSchema = new Schema(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      required: true,
    },
    addon: { type: String, enum: ['virtualRoom3d'], required: true },
    partySize: { type: Number, required: true },
    unitFeeCents: { type: Number, required: true },
    feeCents: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'charged', 'waived'],
      default: 'pending',
    },
    billingPeriod: { type: String, required: true },
  },
  { timestamps: true },
);

addonFeeSchema.index({ restaurantId: 1, billingPeriod: 1, addon: 1 });
addonFeeSchema.index({ reservationId: 1, addon: 1 }, { unique: true });

export type AddonFeeDocument = InferSchemaType<typeof addonFeeSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AddonFee: Model<AddonFeeDocument> =
  mongoose.models.AddonFee ?? mongoose.model<AddonFeeDocument>('AddonFee', addonFeeSchema);
