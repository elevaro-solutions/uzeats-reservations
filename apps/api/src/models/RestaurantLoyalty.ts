import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const restaurantLoyaltySchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    dinerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation' },
    type: { type: String, enum: ['earn', 'redeem', 'adjust'], required: true },
    points: { type: Number, required: true },
    description: { type: String, required: true },
  },
  { timestamps: true },
);

restaurantLoyaltySchema.index({ restaurantId: 1, dinerId: 1, createdAt: -1 });

export type RestaurantLoyaltyTransactionDocument = InferSchemaType<
  typeof restaurantLoyaltySchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const RestaurantLoyaltyTransaction: Model<RestaurantLoyaltyTransactionDocument> =
  mongoose.models.RestaurantLoyaltyTransaction ??
  mongoose.model<RestaurantLoyaltyTransactionDocument>(
    'RestaurantLoyaltyTransaction',
    restaurantLoyaltySchema,
  );
