import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

/** Single-use invite that binds a messenger chat to a user (`/start <token>`). */
const messengerLinkTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

messengerLinkTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type MessengerLinkTokenDocument = InferSchemaType<typeof messengerLinkTokenSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const MessengerLinkToken: Model<MessengerLinkTokenDocument> =
  mongoose.models.MessengerLinkToken ??
  mongoose.model<MessengerLinkTokenDocument>('MessengerLinkToken', messengerLinkTokenSchema);
