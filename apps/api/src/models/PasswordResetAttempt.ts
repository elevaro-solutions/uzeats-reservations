import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const passwordResetAttemptSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    count: { type: Number, required: true, default: 0 },
    windowStartedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export type PasswordResetAttemptDocument = InferSchemaType<typeof passwordResetAttemptSchema> & {
  _id: mongoose.Types.ObjectId;
} & mongoose.Document;

export const PasswordResetAttempt: Model<PasswordResetAttemptDocument> =
  mongoose.models.PasswordResetAttempt ??
  mongoose.model<PasswordResetAttemptDocument>('PasswordResetAttempt', passwordResetAttemptSchema);
