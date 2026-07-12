import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const coverFeeSchema = new Schema(
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
    dinerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    partySize: { type: Number, required: true },
    source: {
      type: String,
      enum: ['network', 'website', 'widget', 'phone', 'walkin'],
      required: true,
    },
    feeCents: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'charged', 'waived'],
      default: 'pending',
    },
    billingPeriod: { type: String },
  },
  { timestamps: true },
);

coverFeeSchema.index({ restaurantId: 1, billingPeriod: 1 });
coverFeeSchema.index({ reservationId: 1 }, { unique: true });

export type CoverFeeDocument = InferSchemaType<typeof coverFeeSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CoverFee: Model<CoverFeeDocument> =
  mongoose.models.CoverFee ??
  mongoose.model<CoverFeeDocument>('CoverFee', coverFeeSchema);
