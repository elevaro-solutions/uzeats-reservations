import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

/** Monthly messenger-bot subscription charge for one restaurant. */
const messengerBotFeeChargeSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    /** Calendar period YYYY-MM (matches Invoice.billingPeriod). */
    billingPeriod: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    amountCents: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'charged', 'waived', 'failed'],
      default: 'pending',
    },
    billingMethod: {
      type: String,
      enum: ['MONTHLY_INVOICE'],
      required: true,
      default: 'MONTHLY_INVOICE',
    },
    billedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

messengerBotFeeChargeSchema.index({ restaurantId: 1, billingPeriod: 1 }, { unique: true });
messengerBotFeeChargeSchema.index({ status: 1, createdAt: -1 });

export type MessengerBotFeeChargeDocument = InferSchemaType<typeof messengerBotFeeChargeSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const MessengerBotFeeCharge: Model<MessengerBotFeeChargeDocument> =
  mongoose.models.MessengerBotFeeCharge ??
  mongoose.model<MessengerBotFeeChargeDocument>(
    'MessengerBotFeeCharge',
    messengerBotFeeChargeSchema,
  );
