import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

/**
 * Two-way messaging between a restaurant and a diner about a specific reservation.
 * A conversation is keyed by reservationId — each booking has its own history.
 */
const messageSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    dinerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', required: true, index: true },
    senderType: { type: String, enum: ['restaurant', 'diner'], required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 2000 },
    readAt: { type: Date },
    flagged: { type: Boolean, default: false, index: true },
    flagReason: { type: String },
    flaggedAt: { type: Date },
    flaggedById: { type: Schema.Types.ObjectId, ref: 'User' },
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

messageSchema.index({ reservationId: 1, createdAt: -1 });
messageSchema.index({ restaurantId: 1, reservationId: 1, createdAt: -1 });

export type MessageDocument = InferSchemaType<typeof messageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Message: Model<MessageDocument> =
  mongoose.models.Message ?? mongoose.model<MessageDocument>('Message', messageSchema);
