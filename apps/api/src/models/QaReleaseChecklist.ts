import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const checkSchema = new Schema(
  {
    itemId: { type: String, required: true },
    checked: { type: Boolean, default: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date },
  },
  { _id: false },
);

const qaReleaseChecklistSchema = new Schema(
  {
    release: { type: String, required: true, unique: true, trim: true },
    envNote: { type: String, default: '' },
    p0Clear: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['active', 'signed'], default: 'active' },
    checks: { type: [checkSchema], default: [] },
    signedOffBy: { type: Schema.Types.ObjectId, ref: 'User' },
    signedOffName: { type: String, default: '' },
    signedOffRole: { type: String, default: '' },
    signedAt: { type: Date },
  },
  { timestamps: true },
);

export type QaReleaseChecklistDocument = InferSchemaType<typeof qaReleaseChecklistSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const QaReleaseChecklist: Model<QaReleaseChecklistDocument> =
  mongoose.models.QaReleaseChecklist ??
  mongoose.model<QaReleaseChecklistDocument>('QaReleaseChecklist', qaReleaseChecklistSchema);
