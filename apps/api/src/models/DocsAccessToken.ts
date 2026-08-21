import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const docsAccessTokenSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date },
  },
  { timestamps: true },
);

docsAccessTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type DocsAccessTokenDocument = InferSchemaType<
  typeof docsAccessTokenSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const DocsAccessToken: Model<DocsAccessTokenDocument> =
  mongoose.models.DocsAccessToken ??
  mongoose.model<DocsAccessTokenDocument>(
    "DocsAccessToken",
    docsAccessTokenSchema,
  );
