import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const loyaltySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation' },
    type: { type: String, enum: ['earn', 'redeem', 'adjust'], required: true },
    points: { type: Number, required: true },
    description: { type: String, required: true },
  },
  { timestamps: true },
);

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    channel: {
      type: String,
      enum: ['email', 'telegram', 'push', 'sms', 'in_app'],
      required: true,
    },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['queued', 'sent', 'failed'],
      default: 'queued',
    },
    sentAt: { type: Date },
    readAt: { type: Date },
    error: { type: String },
  },
  { timestamps: true },
);

export type LoyaltyDocument = InferSchemaType<typeof loyaltySchema> & {
  _id: mongoose.Types.ObjectId;
};

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LoyaltyTransaction: Model<LoyaltyDocument> =
  mongoose.models.LoyaltyTransaction ??
  mongoose.model<LoyaltyDocument>('LoyaltyTransaction', loyaltySchema);

export const Notification: Model<NotificationDocument> =
  mongoose.models.Notification ??
  mongoose.model<NotificationDocument>('Notification', notificationSchema);
