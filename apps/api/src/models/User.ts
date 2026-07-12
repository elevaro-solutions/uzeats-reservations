import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import type { UserRole } from '@reservations/shared';

const pushTokenSchema = new Schema(
  {
    token: { type: String, required: true },
    platform: { type: String, enum: ['web', 'ios', 'android'], required: true },
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
    pushTokens: { type: [pushTokenSchema], default: [] },
    telegramChatId: { type: String },
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
};

export const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>('User', userSchema);
