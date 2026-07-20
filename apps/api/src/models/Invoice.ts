import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const invoiceLineSchema = new Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitAmountCents: { type: Number, required: true },
    amountCents: { type: Number, required: true },
  },
  { _id: false },
);

const invoiceSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      index: true,
    },
    status: {
      type: String,
      enum: ['upcoming', 'pending', 'paid', 'canceled', 'overdue'],
      default: 'upcoming',
      index: true,
    },
    billingPeriod: { type: String, required: true, index: true },
    currency: { type: String, default: 'usd' },
    subtotalCents: { type: Number, required: true },
    totalCents: { type: Number, required: true },
    lines: { type: [invoiceLineSchema], default: [] },
    dueDate: { type: Date, required: true },
    paidAt: { type: Date },
    canceledAt: { type: Date },
    notes: { type: String },
    stripeInvoiceId: { type: String, sparse: true, unique: true },
  },
  { timestamps: true },
);

invoiceSchema.index({ restaurantId: 1, billingPeriod: 1 }, { unique: true });
invoiceSchema.index({ status: 1, dueDate: 1 });

export type InvoiceDocument = InferSchemaType<typeof invoiceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Invoice: Model<InvoiceDocument> =
  mongoose.models.Invoice ?? mongoose.model<InvoiceDocument>('Invoice', invoiceSchema);
