import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { RESTAURANT_SLUG_REQUEST_STATUSES } from '@reservations/shared';

const restaurantSlugRequestSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    requestedById: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    currentSlug: { type: String, required: true, trim: true },
    requestedSlug: { type: String, required: true, trim: true, lowercase: true, index: true },
    reason: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: RESTAURANT_SLUG_REQUEST_STATUSES,
      default: 'pending',
      index: true,
    },
    reviewedById: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

restaurantSlugRequestSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
restaurantSlugRequestSchema.index({ status: 1, createdAt: -1 });

export type RestaurantSlugRequestDocument = InferSchemaType<typeof restaurantSlugRequestSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const RestaurantSlugRequest: Model<RestaurantSlugRequestDocument> =
  mongoose.models.RestaurantSlugRequest ??
  mongoose.model<RestaurantSlugRequestDocument>(
    'RestaurantSlugRequest',
    restaurantSlugRequestSchema,
  );
