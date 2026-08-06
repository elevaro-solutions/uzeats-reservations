import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const restaurantBookmarkSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    kind: { type: String, enum: ['saved', 'favorite'], required: true },
  },
  { timestamps: true },
);

restaurantBookmarkSchema.index({ userId: 1, restaurantId: 1, kind: 1 }, { unique: true });
restaurantBookmarkSchema.index({ userId: 1, kind: 1, createdAt: -1 });

export type RestaurantBookmarkDocument = InferSchemaType<typeof restaurantBookmarkSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type RestaurantBookmarkKind = 'saved' | 'favorite';

export const RestaurantBookmark: Model<RestaurantBookmarkDocument> =
  mongoose.models.RestaurantBookmark ??
  mongoose.model<RestaurantBookmarkDocument>('RestaurantBookmark', restaurantBookmarkSchema);
