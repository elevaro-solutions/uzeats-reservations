import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

/**
 * Pre-booking messages sent from the public restaurant page.
 * Unlike reservation-scoped Message threads, these are one-way from the guest.
 */
const restaurantInquirySchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    senderName: { type: String, required: true, trim: true, maxlength: 120 },
    senderEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    message: { type: String, required: true, maxlength: 2000 },
    readAt: { type: Date },
  },
  { timestamps: true },
);

restaurantInquirySchema.index({ restaurantId: 1, createdAt: -1 });

export type RestaurantInquiryDocument = InferSchemaType<typeof restaurantInquirySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const RestaurantInquiry: Model<RestaurantInquiryDocument> =
  mongoose.models.RestaurantInquiry ??
  mongoose.model<RestaurantInquiryDocument>('RestaurantInquiry', restaurantInquirySchema);
