import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const smsCreditLedgerSchema = new Schema(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    /** purchase_package | top_up | consume | refund | admin_adjust */
    kind: {
      type: String,
      enum: ['purchase_package', 'top_up', 'consume', 'refund', 'admin_adjust'],
      required: true,
      index: true,
    },
    /** Positive = credit added; negative = messages consumed. */
    deltaMessages: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    amountCents: { type: Number, min: 0 },
    packageId: { type: String },
    packageName: { type: String },
    stripePaymentIntentId: { type: String, sparse: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    note: { type: String },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

smsCreditLedgerSchema.index({ restaurantId: 1, createdAt: -1 });

export type SmsCreditLedgerDocument = InferSchemaType<typeof smsCreditLedgerSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SmsCreditLedger: Model<SmsCreditLedgerDocument> =
  mongoose.models.SmsCreditLedger ??
  mongoose.model<SmsCreditLedgerDocument>('SmsCreditLedger', smsCreditLedgerSchema);
