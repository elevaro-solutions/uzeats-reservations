import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const invoiceLineSchema = new Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitAmountCents: { type: Number, required: true },
    amountCents: { type: Number, required: true },
    originalAmountCents: { type: Number },
    /** finance_charge / declined_fee — preserved when period invoices refresh. */
    kind: { type: String, enum: ['finance_charge', 'declined_fee'] },
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
    /**
     * subscription = plan/period bill, virtual_room = prepaid 3D add-on,
     * service = platform service lines.
     */
    category: {
      type: String,
      enum: ['subscription', 'virtual_room', 'service'],
      default: 'subscription',
      index: true,
    },
    currency: { type: String, default: 'usd' },
    subtotalCents: { type: Number, required: true },
    totalCents: { type: Number, required: true },
    /** Catalog / list price before any manual discount. */
    originalTotalCents: { type: Number },
    lines: { type: [invoiceLineSchema], default: [] },
    /** Months of plan coverage for manually created invoices. */
    packageDurationMonths: { type: Number, min: 1 },
    planKey: { type: String },
    billingCycle: { type: String, enum: ['monthly', 'annual'] },
    serviceIds: [{ type: Schema.Types.ObjectId, ref: 'PlatformService' }],
    dueDate: { type: Date, required: true },
    paidAt: { type: Date },
    canceledAt: { type: Date },
    notes: { type: String },
    /** Public share token for payment / PDF access. */
    payToken: { type: String, sparse: true, unique: true, index: true },
    stripePaymentIntentId: { type: String, sparse: true, index: true },
    stripeInvoiceId: { type: String, sparse: true, unique: true },
    /** When the invoice PDF was emailed to the owner (avoids repeat sends on daily refresh). */
    emailSentAt: { type: Date },
    emailSentTo: { type: String },
    /** Last auto-charge attempt metadata. */
    autoChargeAttemptedAt: { type: Date },
    autoChargeError: { type: String },
    /** Monthly 1.5% assessments already applied. */
    financeChargeCount: { type: Number, default: 0 },
    lastFinanceChargeAt: { type: Date },
    declinedFeeAssessedAt: { type: Date },
    /** Notice keys already emailed (day_1, day_8, …). */
    enforcementNoticesSent: { type: [String], default: [] },
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
