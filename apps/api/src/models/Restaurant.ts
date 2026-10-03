import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const addressSchema = new Schema(
  {
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true, index: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, default: 'US' },
    neighborhood: { type: String, index: true },
  },
  { _id: false },
);

const restaurantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, unique: true, index: true },
    previousSlugs: [{ type: String, index: true }],
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
    menuUrl: { type: String },
    logoUrl: { type: String },
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
    allowGuestTableSelection: { type: Boolean, default: false },
    reservationsEnabled: { type: Boolean, default: true },
    reservationsVisible: { type: Boolean, default: true },
    /** When true, online bookings may stay pending until staff confirms. */
    manualApprovalEnabled: { type: Boolean, default: false },
    /** `gt` = party size > n; `gte` = party size ≥ n. Ignored when disabled. */
    manualApprovalPartySizeOp: {
      type: String,
      enum: ['gt', 'gte'],
      default: 'gte',
    },
    /**
     * Party-size threshold for restaurant-level approval.
     * When enabled and unset, every online booking needs approval.
     */
    manualApprovalPartySize: { type: Number, min: 1 },

    posApiKey: { type: String, sparse: true, unique: true },
    posApiKeyHash: { type: String, sparse: true, unique: true },
    posEnabled: { type: Boolean, default: false },
    // Marketing: featured placement boosts search ranking while active
    featured: { type: Boolean, default: false, index: true },
    featuredUntil: { type: Date },
    // Real-time guest spend alerts (0 = disabled)
    spendAlertThresholdCents: { type: Number, default: 0 },
    // Per-restaurant loyalty program (separate from platform Tablevera points)
    loyaltyEnabled: { type: Boolean, default: false },
    loyaltyPointsPerVisit: { type: Number, default: 50, min: 0 },
    loyaltyMinRedeemPoints: { type: Number, default: 200, min: 0 },
    // Booking widget customization (Pro)
    widgetTheme: {
      primaryColor: { type: String, default: '#0b3d2e' },
      buttonText: { type: String, default: 'Reserve a table' },
      showReviews: { type: Boolean, default: true },
    },
    // Discovery & local SEO attributes
    categoryIds: [{ type: String, index: true }],
    landmarkIds: [{ type: String, index: true }],
    diningStyles: [{ type: String, index: true }],
    discoveryOccasions: [{ type: String, index: true }],
    meals: [{ type: String, index: true }],
    dietaryTags: [{ type: String, index: true }],
    amenities: [{ type: String, index: true }],
    wheelchairAccessible: { type: Boolean, default: false, index: true },
    faq: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
    featuredIn: [
      {
        title: { type: String, required: true },
        description: { type: String },
        url: { type: String },
        logoUrl: { type: String },
      },
    ],
    termsAndConditions: { type: String, default: '' },
    /** Optional underlay image for the table layout editor / live floor (legacy default). */
    floorPlanBackgroundUrl: { type: String },
    /** Optional solid canvas color behind the grid (hex; legacy default). */
    floorPlanBackgroundColor: { type: String },
    /** Per-floor-area canvas color / underlay image. */
    floorPlanAreaAppearances: [
      {
        floorArea: { type: String, required: true },
        backgroundColor: { type: String },
        backgroundUrl: { type: String },
      },
    ],
    /** Non-bookable venue objects (bar, walls, host stand, …). */
    floorFixtures: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        kind: {
          type: String,
          enum: ['bar', 'host_stand', 'kitchen', 'wall', 'door', 'plant', 'other'],
          required: true,
        },
        floorArea: { type: String, default: 'Main' },
        posX: { type: Number, default: 0 },
        posY: { type: Number, default: 0 },
        width: { type: Number, default: 2 },
        height: { type: Number, default: 1 },
        rotation: { type: Number, default: 0 },
      },
    ],
    /**
     * Unpublished layout edits. When set, the table-layout editor prefers this
     * over live table positions until publishFloorPlan clears it.
     */
    floorPlanDraft: {
      updatedAt: { type: Date },
      backgroundUrl: { type: String },
      backgroundColor: { type: String },
      areaAppearances: { type: Schema.Types.Mixed },
      fixtures: { type: Schema.Types.Mixed },
      positions: { type: Schema.Types.Mixed },
      rooms: { type: Schema.Types.Mixed },
      scale: { type: Schema.Types.Mixed },
    },
    floorPlanPublishedAt: { type: Date },
    /** Room polygons for the layout editor (grid units). */
    floorRooms: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        floorArea: { type: String, default: 'Main' },
        points: [
          {
            x: { type: Number, required: true },
            y: { type: Number, required: true },
          },
        ],
      },
    ],
    /** Real-world scale for one grid cell. */
    floorPlanScale: {
      unit: { type: String, enum: ['ft', 'm'], default: 'ft' },
      unitsPerCell: { type: Number, default: 2, min: 0.25, max: 50 },
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
