import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const staffInviteSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['staff', 'restaurant_owner'],
      default: 'staff',
    },
    restaurantIds: [{ type: Schema.Types.ObjectId, ref: 'Restaurant' }],
    token: { type: String, required: true, unique: true },
    invitedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export type StaffInviteDocument = InferSchemaType<typeof staffInviteSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const StaffInvite: Model<StaffInviteDocument> =
  mongoose.models.StaffInvite ??
  mongoose.model<StaffInviteDocument>('StaffInvite', staffInviteSchema);
