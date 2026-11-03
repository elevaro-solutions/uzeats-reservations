import mongoose, { Schema, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';

const checkSchema = new Schema(
  {
    itemId: { type: String, required: true },
    checked: { type: Boolean, default: false },
    note: { type: String, default: '' },
    checkedAt: { type: Date },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date },
  },
  { _id: false },
);

const catalogItemSchema = new Schema(
  {
    id: { type: String, required: true },
    gate: { type: String, required: true },
    group: { type: String, required: true },
    label: { type: String, required: true },
    steps: { type: [String], default: [] },
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
    /** Frozen task definitions for this release so a later catalog replace cannot erase them. */
    catalog: { type: [catalogItemSchema], default: [] },
    checks: { type: [checkSchema], default: [] },
    signedOffBy: { type: Schema.Types.ObjectId, ref: 'User' },
    signedOffName: { type: String, default: '' },
    signedOffRole: { type: String, default: '' },
    signedAt: { type: Date },
  },
  { timestamps: true },
);

type QaReleaseChecklistFields = InferSchemaType<typeof qaReleaseChecklistSchema>;

export type QaReleaseChecklistDocument = HydratedDocument<QaReleaseChecklistFields>;

export const QaReleaseChecklist: Model<QaReleaseChecklistFields> =
  mongoose.models.QaReleaseChecklist ??
  mongoose.model<QaReleaseChecklistFields>('QaReleaseChecklist', qaReleaseChecklistSchema);
