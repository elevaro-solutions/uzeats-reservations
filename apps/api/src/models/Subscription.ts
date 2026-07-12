import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

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
      enum: ['basic', 'core', 'pro', 'enterprise'],
      required: true,
    },
    status: {
      type: String,
      enum: ['trialing', 'active', 'past_due', 'cancelled', 'paused'],
      default: 'trialing',
    },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    trialEndsAt: { type: Date },
    cancelledAt: { type: Date },
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
      // Premium SMS purchased as a $25/mo add-on on Core
      premiumSmsAddon: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export type SubscriptionDocument = InferSchemaType<typeof subscriptionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Subscription: Model<SubscriptionDocument> =
  mongoose.models.Subscription ??
  mongoose.model<SubscriptionDocument>('Subscription', subscriptionSchema);
