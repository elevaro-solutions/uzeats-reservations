import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { LEGAL_AGREEMENT_KEYS } from './LegalAgreement.js';

const userAgreementAcceptanceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agreementKey: {
      type: String,
      required: true,
      enum: LEGAL_AGREEMENT_KEYS,
    },
    version: { type: Number, required: true, min: 1 },
    acceptedAt: { type: Date, required: true, default: () => new Date() },
    /** typed = full legal name; drawn = canvas PNG data URL. */
    signatureMethod: {
      type: String,
      enum: ['typed', 'drawn'],
      required: true,
    },
    signedFullName: { type: String, default: '' },
    /** data:image/...;base64,... when drawn (omit for typed). */
    signatureDataUrl: { type: String, default: '' },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: false },
);

userAgreementAcceptanceSchema.index(
  { userId: 1, agreementKey: 1, version: 1 },
  { unique: true },
);

export type UserAgreementAcceptanceDocument = InferSchemaType<
  typeof userAgreementAcceptanceSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const UserAgreementAcceptance: Model<UserAgreementAcceptanceDocument> =
  mongoose.models.UserAgreementAcceptance ??
  mongoose.model<UserAgreementAcceptanceDocument>(
    'UserAgreementAcceptance',
    userAgreementAcceptanceSchema,
  );
