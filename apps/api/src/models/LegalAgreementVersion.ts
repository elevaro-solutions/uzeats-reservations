import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { LEGAL_AGREEMENT_KEYS } from './LegalAgreement.js';

/** Frozen text of each published agreement version, so signed copies show what was signed. */
const legalAgreementVersionSchema = new Schema(
  {
    key: { type: String, required: true, enum: LEGAL_AGREEMENT_KEYS },
    version: { type: Number, required: true, min: 1 },
    name: { type: String, required: true },
    bodyHtml: { type: String, required: true },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

legalAgreementVersionSchema.index({ key: 1, version: 1 }, { unique: true });

export type LegalAgreementVersionDocument = InferSchemaType<typeof legalAgreementVersionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LegalAgreementVersion: Model<LegalAgreementVersionDocument> =
  mongoose.models.LegalAgreementVersion ??
  mongoose.model<LegalAgreementVersionDocument>(
    'LegalAgreementVersion',
    legalAgreementVersionSchema,
  );
