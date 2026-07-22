import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const giftCardSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    code: { type: String, required: true, unique: true, index: true },
    initialBalanceCents: { type: Number, required: true, min: 1 },
    balanceCents: { type: Number, required: true, min: 0 },
    issuedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    recipientName: { type: String },
    recipientEmail: { type: String },
    expiresAt: { type: Date },
    note: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type GiftCardDocument = InferSchemaType<typeof giftCardSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const GiftCard: Model<GiftCardDocument> =
  mongoose.models.GiftCard ?? mongoose.model<GiftCardDocument>('GiftCard', giftCardSchema);
