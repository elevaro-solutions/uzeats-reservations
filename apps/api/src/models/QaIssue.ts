import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { QA_ISSUE_SEVERITIES, QA_ISSUE_STATUSES } from '@reservations/shared';

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    key: { type: String, default: '' },
    filename: { type: String, required: true, maxlength: 255 },
    contentType: { type: String, required: true, maxlength: 120 },
    size: { type: Number, min: 0 },
  },
  { _id: true },
);

const qaIssueSchema = new Schema(
  {
    number: { type: Number, required: true, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 20_000 },
    tags: { type: [String], default: [] },
    status: { type: String, enum: QA_ISSUE_STATUSES, default: 'open', index: true },
    severity: { type: String, enum: QA_ISSUE_SEVERITIES, default: 'p2', index: true },
    path: { type: String, default: '', maxlength: 500 },
    environment: { type: String, default: '', maxlength: 200 },
    release: { type: String, default: '', maxlength: 40 },
    attachments: { type: [attachmentSchema], default: [] },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reporterName: { type: String, required: true, maxlength: 200 },
  },
  { timestamps: true },
);

qaIssueSchema.index({ updatedAt: -1 });
qaIssueSchema.index({ tags: 1, updatedAt: -1 });

export type QaIssueDocument = InferSchemaType<typeof qaIssueSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const QaIssue: Model<QaIssueDocument> =
  mongoose.models.QaIssue ?? mongoose.model<QaIssueDocument>('QaIssue', qaIssueSchema);
