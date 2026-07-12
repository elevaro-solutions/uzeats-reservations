import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

/** Public promotion / special offer shown on the restaurant's listing. */
const promotionSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    discountPercent: { type: Number, min: 0, max: 100 },
    code: { type: String },
    startDate: { type: String }, // YYYY-MM-DD
    endDate: { type: String },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    active: { type: Boolean, default: true },
    redemptions: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type PromotionDocument = InferSchemaType<typeof promotionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Promotion: Model<PromotionDocument> =
  mongoose.models.Promotion ??
  mongoose.model<PromotionDocument>('Promotion', promotionSchema);

/**
 * Pay-per-cover boost campaign: while active, the restaurant ranks higher
 * in search. Each seated cover attributed to the boost is charged extra.
 */
const boostCampaignSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true },
    costPerCoverCents: { type: Number, required: true, min: 0 },
    budgetCents: { type: Number, required: true, min: 0 },
    spentCents: { type: Number, default: 0 },
    coversAttributed: { type: Number, default: 0 },
    startDate: { type: String, required: true }, // YYYY-MM-DD
    endDate: { type: String },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'exhausted'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true },
);

export type BoostCampaignDocument = InferSchemaType<typeof boostCampaignSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BoostCampaign: Model<BoostCampaignDocument> =
  mongoose.models.BoostCampaign ??
  mongoose.model<BoostCampaignDocument>('BoostCampaign', boostCampaignSchema);
