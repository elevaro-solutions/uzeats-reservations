import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { RESTAURANT_PROFILE_CHANGE_REQUEST_STATUSES } from '@reservations/shared';

const restaurantProfileChangeRequestSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    requestedById: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    current: { type: Schema.Types.Mixed, required: true },
    proposed: { type: Schema.Types.Mixed, required: true },
    reason: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: RESTAURANT_PROFILE_CHANGE_REQUEST_STATUSES,
      default: 'pending',
      index: true,
    },
    reviewedById: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

restaurantProfileChangeRequestSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
restaurantProfileChangeRequestSchema.index({ status: 1, createdAt: -1 });

export type RestaurantProfileChangeRequestDocument = InferSchemaType<
  typeof restaurantProfileChangeRequestSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const RestaurantProfileChangeRequest: Model<RestaurantProfileChangeRequestDocument> =
  mongoose.models.RestaurantProfileChangeRequest ??
  mongoose.model<RestaurantProfileChangeRequestDocument>(
    'RestaurantProfileChangeRequest',
    restaurantProfileChangeRequestSchema,
  );
