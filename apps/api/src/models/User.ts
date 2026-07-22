import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import type { UserRole } from '@reservations/shared';

const pushTokenSchema = new Schema(
  {
    token: { type: String, required: true },
    platform: { type: String, enum: ['web', 'ios', 'android'], required: true },
  },
  { _id: false },
);

const notificationChannelPreferencesSchema = new Schema(
  {
    sms: { type: Boolean, default: false },
    email: { type: Boolean, default: true },
    webPush: { type: Boolean, default: true },
    platform: { type: Boolean, default: true },
  },
  { _id: false },
);

const notificationPreferencesSchema = new Schema(
  {
    newMessage: { type: notificationChannelPreferencesSchema, default: () => ({}) },
    newReservation: { type: notificationChannelPreferencesSchema, default: () => ({}) },
    waitlistAvailable: { type: notificationChannelPreferencesSchema, default: () => ({}) },
    guestSpendAlert: { type: notificationChannelPreferencesSchema, default: () => ({}) },
    reservationUpdates: { type: notificationChannelPreferencesSchema, default: () => ({}) },
    reviewReply: { type: notificationChannelPreferencesSchema, default: () => ({}) },
    surveyInvitation: { type: notificationChannelPreferencesSchema, default: () => ({}) },
    loyaltyUpdates: { type: notificationChannelPreferencesSchema, default: () => ({}) },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    email: { type: String, sparse: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    phone: { type: String, sparse: true, unique: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['diner', 'restaurant_owner', 'staff', 'admin'],
      default: 'diner',
    },
    googleId: { type: String, sparse: true, unique: true },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    loyaltyCompletedVisits: { type: Number, default: 0, min: 0 },
    loyaltyPointsExpireAt: { type: Date },
    referralCode: { type: String, sparse: true, unique: true, uppercase: true, trim: true },
    referredByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    pushTokens: { type: [pushTokenSchema], default: [] },
    telegramChatId: { type: String },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    restaurantIds: [{ type: Schema.Types.ObjectId, ref: 'Restaurant' }],
    refreshTokens: [{ type: String }],
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
  role: UserRole;
} & mongoose.Document;

export const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>('User', userSchema);
