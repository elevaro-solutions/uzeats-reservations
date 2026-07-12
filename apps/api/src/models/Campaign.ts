import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const campaignSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sent', 'cancelled'],
      default: 'draft',
    },
    targetTags: [{ type: String }],
    targetVipStatus: { type: String },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    recipientCount: { type: Number, default: 0 },
    openCount: { type: Number, default: 0 },
    clickCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type CampaignDocument = InferSchemaType<typeof campaignSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Campaign: Model<CampaignDocument> =
  mongoose.models.Campaign ??
  mongoose.model<CampaignDocument>('Campaign', campaignSchema);
