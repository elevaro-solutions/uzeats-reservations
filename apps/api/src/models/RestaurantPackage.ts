import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const restaurantPackageSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    priceCents: { type: Number, required: true, min: 0 },
    /** When true, priceCents is charged per guest; otherwise flat per booking. */
    pricePerGuest: { type: Boolean, default: false },
    includes: [{ type: String }],
    photoUrl: { type: String },
    /** Booking occasions this package applies to; empty = all occasions. */
    occasions: [
      {
        type: String,
        enum: ['birthday', 'anniversary', 'business', 'date', 'celebration', 'other'],
      },
    ],
    minPartySize: { type: Number, min: 1 },
    maxPartySize: { type: Number, min: 1 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

restaurantPackageSchema.index({ restaurantId: 1, active: 1 });

export type RestaurantPackageDocument = InferSchemaType<typeof restaurantPackageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const RestaurantPackage: Model<RestaurantPackageDocument> =
  mongoose.models.RestaurantPackage ??
  mongoose.model<RestaurantPackageDocument>('RestaurantPackage', restaurantPackageSchema);
