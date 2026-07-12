import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const experienceSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ['tasting', 'class', 'special_menu', 'wine_pairing', 'chef_table', 'holiday', 'other'],
      required: true,
    },
    photoUrl: { type: String },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    maxGuests: { type: Number, required: true },
    ticketPriceCents: { type: Number, required: true },
    ticketsSold: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'published', 'sold_out', 'completed', 'cancelled'],
      default: 'draft',
    },
    includes: [{ type: String }],
    tags: [{ type: String }],
  },
  { timestamps: true },
);

experienceSchema.index({ restaurantId: 1, date: 1 });
experienceSchema.index({ status: 1, date: 1 });

export type ExperienceDocument = InferSchemaType<typeof experienceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Experience: Model<ExperienceDocument> =
  mongoose.models.Experience ??
  mongoose.model<ExperienceDocument>('Experience', experienceSchema);
