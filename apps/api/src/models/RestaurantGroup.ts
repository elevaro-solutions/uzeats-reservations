import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const restaurantGroupSchema = new Schema(
  {
    name: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    restaurantIds: [{ type: Schema.Types.ObjectId, ref: 'Restaurant' }],
    adminUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    settings: {
      sharedGuestProfiles: { type: Boolean, default: true },
      centralizedReporting: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

restaurantGroupSchema.index({ ownerId: 1 });
restaurantGroupSchema.index({ adminUserIds: 1 });

export type RestaurantGroupDocument = InferSchemaType<typeof restaurantGroupSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const RestaurantGroup: Model<RestaurantGroupDocument> =
  mongoose.models.RestaurantGroup ??
  mongoose.model<RestaurantGroupDocument>('RestaurantGroup', restaurantGroupSchema);
