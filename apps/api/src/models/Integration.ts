import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

/**
 * Third-party booking integration (affiliate sites, Google Reserve, etc.).
 * Each partner gets an API key scoped to a restaurant and can create
 * reservations through the partner REST API.
 *
 * New keys are stored as `apiKeyHash` (+ display `apiKeyPrefix`). Legacy
 * plaintext `apiKey` values are migrated on first successful auth.
 */
const integrationSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    provider: {
      type: String,
      enum: ['google_reserve', 'partner_site', 'affiliate', 'other'],
      required: true,
    },
    name: { type: String, required: true },
    /** @deprecated Prefer apiKeyHash — kept for legacy rows until migrated. */
    apiKey: { type: String, unique: true, sparse: true },
    apiKeyHash: { type: String, unique: true, sparse: true },
    apiKeyPrefix: { type: String },
    enabled: { type: Boolean, default: true },
    bookingsCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date },
  },
  { timestamps: true },
);

export type IntegrationDocument = InferSchemaType<typeof integrationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Integration: Model<IntegrationDocument> =
  mongoose.models.Integration ??
  mongoose.model<IntegrationDocument>('Integration', integrationSchema);
