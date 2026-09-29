import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { REVIEW_REACTIONS } from '@reservations/shared';

const reviewReactionSchema = new Schema(
  {
    reviewId: { type: Schema.Types.ObjectId, ref: 'Review', required: true, index: true },
    // Signed-in reactor. Sparse so guest reactions (visitorKey only) are allowed.
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    // Browser-stable guest id from X-Visitor-Key. Sparse for signed-in rows.
    visitorKey: { type: String, maxlength: 64, index: true },
    type: { type: String, enum: [...REVIEW_REACTIONS], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

reviewReactionSchema.index(
  { reviewId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } },
);
reviewReactionSchema.index(
  { reviewId: 1, visitorKey: 1 },
  { unique: true, partialFilterExpression: { visitorKey: { $type: 'string' } } },
);

export type ReviewReactionDocument = InferSchemaType<typeof reviewReactionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ReviewReaction: Model<ReviewReactionDocument> =
  mongoose.models.ReviewReaction ??
  mongoose.model<ReviewReactionDocument>('ReviewReaction', reviewReactionSchema);
