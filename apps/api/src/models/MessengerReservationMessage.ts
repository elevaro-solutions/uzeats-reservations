import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { MESSENGER_BOT_PROFILES, MESSENGER_CHANNELS } from './MessengerLink.js';

/** Reservation card already posted to a chat, so status changes edit it in place. */
const messengerReservationMessageSchema = new Schema(
  {
    channel: { type: String, enum: MESSENGER_CHANNELS, required: true },
    chatId: { type: String, required: true },
    messageId: { type: String, required: true },
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    profile: { type: String, enum: MESSENGER_BOT_PROFILES, required: true },
  },
  { timestamps: true },
);

messengerReservationMessageSchema.index(
  { reservationId: 1, channel: 1, chatId: 1 },
  { unique: true },
);
messengerReservationMessageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 14 * 24 * 3600 },
);

export type MessengerReservationMessageDocument = InferSchemaType<
  typeof messengerReservationMessageSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const MessengerReservationMessage: Model<MessengerReservationMessageDocument> =
  mongoose.models.MessengerReservationMessage ??
  mongoose.model<MessengerReservationMessageDocument>(
    'MessengerReservationMessage',
    messengerReservationMessageSchema,
  );
