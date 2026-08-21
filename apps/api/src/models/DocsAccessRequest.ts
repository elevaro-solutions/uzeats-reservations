import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { DOCS_ACCESS_REQUEST_STATUSES } from '@reservations/shared';

const docsAccessRequestSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    firstName: { type: String, trim: true, maxlength: 80 },
    lastName: { type: String, trim: true, maxlength: 80 },
    company: { type: String, trim: true, maxlength: 120 },
    reason: { type: String, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: DOCS_ACCESS_REQUEST_STATUSES,
      default: 'pending',
      index: true,
    },
    reviewedById: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

docsAccessRequestSchema.index({ status: 1, createdAt: -1 });
docsAccessRequestSchema.index({ email: 1, status: 1 });

export type DocsAccessRequestDocument = InferSchemaType<typeof docsAccessRequestSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const DocsAccessRequest: Model<DocsAccessRequestDocument> =
  mongoose.models.DocsAccessRequest ??
  mongoose.model<DocsAccessRequestDocument>('DocsAccessRequest', docsAccessRequestSchema);
