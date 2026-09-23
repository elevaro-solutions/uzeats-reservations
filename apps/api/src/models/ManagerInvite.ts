import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const managerInviteSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['manager', 'restaurant_owner'],
      default: 'manager',
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

export type ManagerInviteDocument = InferSchemaType<typeof managerInviteSchema> & {
  _id: mongoose.Types.ObjectId;
};

/** Keep legacy Mongo collection name so existing invites continue to resolve. */
export const ManagerInvite: Model<ManagerInviteDocument> =
  mongoose.models.ManagerInvite ??
  mongoose.model<ManagerInviteDocument>('ManagerInvite', managerInviteSchema, 'staffinvites');
