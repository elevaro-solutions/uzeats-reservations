import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const subscriptionSchema = new Schema(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      unique: true,
    },
    plan: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['trialing', 'active', 'past_due', 'cancelled', 'paused'],
      default: 'trialing',
    },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    /** Preferred card for platform invoices (Stripe PaymentMethod id). */
    preferredPaymentMethodId: { type: String },
    /** When true and a preferred/default card exists, unpaid period invoices are auto-charged. */
    autoChargeInvoices: { type: Boolean, default: true },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    trialEndsAt: { type: Date },
    cancelledAt: { type: Date },
    /**
     * Soft cancel: Stripe cancel_at_period_end. Status stays active/trialing and
     * features remain until currentPeriodEnd; then finalize to cancelled.
     */
    cancelAtPeriodEnd: { type: Boolean, default: false },
    pendingPlan: { type: String },
    pendingPlanEffectiveAt: { type: Date },
    lastPaidPlanChangeAt: { type: Date },
    amountDueCents: { type: Number, default: 0 },
    /** When status last became past_due (clock for Stripe-only balances). */
    pastDueSince: { type: Date },
    billingEnforcement: {
      stage: {
        type: String,
        enum: ['current', 'grace', 'overdue', 'unlisted', 'restricted', 'terminated'],
        default: 'current',
      },
      pausedAt: { type: Date },
      pauseReason: { type: String },
      graceExtendedUntil: { type: Date },
      unlistedAt: { type: Date },
      restrictedAt: { type: Date },
      terminatedAt: { type: Date },
      lastNoticeKey: { type: String },
      lastNoticeAt: { type: Date },
      oldestUnpaidDueDate: { type: Date },
      outstandingCents: { type: Number, default: 0 },
    },
    monthlyPriceCents: { type: Number, required: true },
    networkCoverFeeCents: { type: Number, required: true },
    websiteCoverFeeCents: { type: Number, default: 0 },
    features: {
      floorPlans: { type: Boolean, default: false },
      smartAssign: { type: Boolean, default: false },
      waitlist: { type: Boolean, default: false },
      premiumSms: { type: Boolean, default: false },
      guestProfiles360: { type: Boolean, default: false },
      emailCampaigns: { type: Boolean, default: false },
      customWidget: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      dedicatedSupport: { type: Boolean, default: false },
      accessRules: { type: Boolean, default: false },
      posIntegration: { type: Boolean, default: false },
      twoWayMessaging: { type: Boolean, default: false },
      spendAlerts: { type: Boolean, default: false },
      ticketedEvents: { type: Boolean, default: false },
      preShift: { type: Boolean, default: false },
      autoTags: { type: Boolean, default: false },
      surveys: { type: Boolean, default: false },
      revenueForecasting: { type: Boolean, default: false },
      customReports: { type: Boolean, default: false },
      multiLocationAnalytics: { type: Boolean, default: false },
      promotions: { type: Boolean, default: false },
      featuredPlacement: { type: Boolean, default: false },
      boostCampaigns: { type: Boolean, default: false },
      threeDView: { type: Boolean, default: false },
      // Legacy free toggle — guest SMS now uses prepaid credits (`addons.smsCredits`).
      premiumSmsAddon: { type: Boolean, default: false },
    },
    /** Paid add-ons kept outside `features`, which plan changes overwrite. */
    addons: {
      /**
       * Prepaid guest SMS balance. Plans with `premiumSms` included do not consume this.
       * Purchases (packages / top-ups) credit `balance`; each sent guest SMS decrements by 1.
       */
      smsCredits: {
        balance: { type: Number, default: 0, min: 0 },
        updatedAt: { type: Date },
      },
      virtualRoom3d: {
        enabled: { type: Boolean, default: false },
        enabledAt: { type: Date },
        disabledAt: { type: Date },
        /**
         * Admin-granted trial: billed at `trialPriceCents` (0 = free) until `trialEndsAt`.
         * After the trial, uses `priceOverrideCents` when set, else platform monthly price.
         */
        trialPriceCents: { type: Number },
        trialEndsAt: { type: Date },
        trialDurationMonths: { type: Number },
        /** Optional per-restaurant monthly price after trial (cents). */
        priceOverrideCents: { type: Number },
        /** UTC months the add-on was on at any point, with the monthly price locked in for that month. */
        billedMonths: {
          type: [
            {
              _id: false,
              period: { type: String, required: true },
              priceCents: { type: Number, required: true },
              /** Set when the month was charged upfront at enable (skip period-invoice line). */
              prepaid: { type: Boolean, default: false },
              paidAt: { type: Date },
            },
          ],
          default: [],
        },
      },
    },
  },
  { timestamps: true },
);

type SubscriptionFields = InferSchemaType<typeof subscriptionSchema>;

export type SubscriptionDocument = HydratedDocument<SubscriptionFields>;

export const Subscription: Model<SubscriptionFields> =
  mongoose.models.Subscription ??
  mongoose.model<SubscriptionFields>('Subscription', subscriptionSchema);
