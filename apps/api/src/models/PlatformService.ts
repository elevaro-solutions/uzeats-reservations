import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const platformServiceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String, default: '' },
    /** 0 = free service. */
    priceCents: { type: Number, required: true, default: 0, min: 0 },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

platformServiceSchema.index({ active: 1, sortOrder: 1, name: 1 });

export type PlatformServiceDocument = InferSchemaType<typeof platformServiceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PlatformService: Model<PlatformServiceDocument> =
  mongoose.models.PlatformService ??
  mongoose.model<PlatformServiceDocument>('PlatformService', platformServiceSchema);
