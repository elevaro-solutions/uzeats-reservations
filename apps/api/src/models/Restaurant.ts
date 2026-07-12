import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const addressSchema = new Schema(
  {
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true, index: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, default: 'US' },
  },
  { _id: false },
);

const restaurantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, default: '' },
    cuisine: { type: String, required: true, index: true },
    priceRange: { type: Number, required: true, min: 1, max: 4 },
    address: { type: addressSchema, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    phone: { type: String },
    website: { type: String },
    photos: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
      index: true,
    },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    depositRequired: { type: Boolean, default: false },
    depositAmountCents: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    useSmartAssign: { type: Boolean, default: true },
    posApiKey: { type: String, sparse: true, unique: true },
    posEnabled: { type: Boolean, default: false },
    // Marketing: featured placement boosts search ranking while active
    featured: { type: Boolean, default: false, index: true },
    featuredUntil: { type: Date },
    // Real-time guest spend alerts (0 = disabled)
    spendAlertThresholdCents: { type: Number, default: 0 },
    // Booking widget customization (Pro)
    widgetTheme: {
      primaryColor: { type: String, default: '#da3743' },
      buttonText: { type: String, default: 'Reserve a table' },
      showReviews: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

restaurantSchema.index({ location: '2dsphere' });
restaurantSchema.index({ name: 'text', description: 'text', cuisine: 'text' });

export type RestaurantDocument = InferSchemaType<typeof restaurantSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Restaurant: Model<RestaurantDocument> =
  mongoose.models.Restaurant ??
  mongoose.model<RestaurantDocument>('Restaurant', restaurantSchema);
