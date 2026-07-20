import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const reviewSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    dinerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      required: true,
      unique: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    ownerReply: { type: String },
    ownerRepliedAt: { type: Date },
    hidden: { type: Boolean, default: false },
    flagged: { type: Boolean, default: false, index: true },
    flagReason: { type: String },
    flaggedAt: { type: Date },
    flaggedById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export type ReviewDocument = InferSchemaType<typeof reviewSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Review: Model<ReviewDocument> =
  mongoose.models.Review ?? mongoose.model<ReviewDocument>('Review', reviewSchema);
