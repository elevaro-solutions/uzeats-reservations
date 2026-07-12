import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

/**
 * Two-way messaging between a restaurant and a diner.
 * A conversation is keyed by (restaurantId, dinerId); messages optionally
 * reference the reservation they're about.
 */
const messageSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    dinerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation' },
    senderType: { type: String, enum: ['restaurant', 'diner'], required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 2000 },
    readAt: { type: Date },
  },
  { timestamps: true },
);

messageSchema.index({ restaurantId: 1, dinerId: 1, createdAt: -1 });

export type MessageDocument = InferSchemaType<typeof messageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Message: Model<MessageDocument> =
  mongoose.models.Message ?? mongoose.model<MessageDocument>('Message', messageSchema);
