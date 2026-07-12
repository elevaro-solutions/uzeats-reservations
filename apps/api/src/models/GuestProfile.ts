import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const guestProfileSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    dinerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [{ type: String }],
    notes: { type: String, default: '' },
    vipStatus: {
      type: String,
      enum: ['none', 'vip', 'regular', 'blacklisted'],
      default: 'none',
    },
    totalVisits: { type: Number, default: 0 },
    totalSpendCents: { type: Number, default: 0 },
    averagePartySize: { type: Number, default: 0 },
    lastVisitDate: { type: Date },
    preferredTable: { type: String },
    dietaryRestrictions: [{ type: String }],
    allergies: [{ type: String }],
    occasions: [{ type: String }],
    customFields: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

guestProfileSchema.index({ restaurantId: 1, dinerId: 1 }, { unique: true });
guestProfileSchema.index({ restaurantId: 1, tags: 1 });
guestProfileSchema.index({ restaurantId: 1, vipStatus: 1 });

export type GuestProfileDocument = InferSchemaType<typeof guestProfileSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const GuestProfile: Model<GuestProfileDocument> =
  mongoose.models.GuestProfile ??
  mongoose.model<GuestProfileDocument>('GuestProfile', guestProfileSchema);
