import mongoose, { Schema, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';
import { FEATURE_KEYS } from '../config/plans.js';

const planOverrideSchema = new Schema(
  {
    name: { type: String },
    description: { type: String },
    monthlyPriceCents: { type: Number },
    originalMonthlyPriceCents: { type: Number },
    discountType: {
      type: String,
      enum: ['none', 'percent_off', 'amount_off', 'first_month_free', 'annual_months_free'],
      default: 'none',
    },
    discountPercent: { type: Number, min: 0, max: 100 },
    discountAmountCents: { type: Number, min: 0 },
    annualFreeMonths: { type: Number, min: 0, max: 11 },
    networkCoverFeeCents: { type: Number },
    websiteCoverFeeCents: { type: Number },
    trialDays: { type: Number },
    /** Owner-invited manager seats included with this package (≥1). */
    managerSeats: { type: Number, min: 1, max: 100 },
    visibleOnPricing: { type: Boolean, default: true },
    /** Public pricing card “Includes” lines. Absent means built-in defaults. */
    highlights: { type: [String], default: undefined },
    features: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const loyaltyTierSchema = new Schema(
  {
    id: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    minVisits: { type: Number, required: true, min: 0 },
    earnMultiplier: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const loyaltyProgramSchema = new Schema(
  {
    pointsPerCompletedVisit: { type: Number, min: 0 },
    pointsPerDollarDeposit: { type: Number, min: 0 },
    redeemPointsPerDollar: { type: Number, min: 1 },
    minRedeemPoints: { type: Number, min: 0 },
    firstBookingBonusPoints: { type: Number, min: 0 },
    pointsPerReview: { type: Number, min: 0 },
    referralBonusPoints: { type: Number, min: 0 },
    pointsExpiryMonths: { type: Number, min: 0, max: 120 },
    tiers: { type: [loyaltyTierSchema], default: undefined },
  },
  { _id: false },
);

const platformConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    supportEmail: { type: String, default: 'support@tablevera.online' },
    supportPhone: { type: String, default: '+16507707788' },
    defaultSignupRole: {
      type: String,
      enum: ['diner', 'restaurant_owner', 'manager'],
      default: 'diner',
    },
    defaultPartnerRole: {
      type: String,
      enum: ['diner', 'restaurant_owner', 'manager'],
      default: 'restaurant_owner',
    },
    defaultManagerRole: {
      type: String,
      enum: ['diner', 'restaurant_owner', 'manager', 'host'],
      default: 'manager',
    },
    maintenanceMode: { type: Boolean, default: false },
    allowPublicRegistration: { type: Boolean, default: true },
    allowPartnerRegistration: { type: Boolean, default: true },
    requireAdminDelete2FA: { type: Boolean, default: true },
    /** When true, new email signups stay unverified until they confirm. Unset → env default (prod on, local off). */
    requireSignupEmailVerification: { type: Boolean },
    invoicePrefix: { type: String, default: 'INV' },
    currency: { type: String, default: 'usd' },
    /**
     * Platform default hours before slot start when free cancellation ends
     * (no-show / late-cancel fee window). Restaurants and resources may override.
     */
    cancellationPeriodHours: { type: Number, default: 24, min: 1, max: 720 },
    /**
     * Which Stripe account the API uses: sandbox (`test`) or production (`live`).
     * Unset → test outside production NODE_ENV, live in production.
     */
    stripeMode: { type: String, enum: ['test', 'live'] },
    featureFlags: {
      waitlist: { type: Boolean, default: true },
      deposits: { type: Boolean, default: true },
      partnerRegistration: { type: Boolean, default: true },
      publicRegistration: { type: Boolean, default: true },
      messaging: { type: Boolean, default: true },
      reviews: { type: Boolean, default: true },
      experiences: { type: Boolean, default: true },
      campaigns: { type: Boolean, default: true },
      widget: { type: Boolean, default: true },
      /** Premium SMS / guest SMS product (not auth OTP). */
      sms: { type: Boolean, default: true },
      /** Experimental paid add-on: 3D room + table selection. Off until a platform admin opts in. */
      virtualRoom3d: { type: Boolean, default: false },
    },
    /** Unset fields fall back to the shared VIRTUAL_ROOM_DEFAULT_* prices. */
    virtualRoomPricing: {
      monthlyPriceCents: { type: Number, min: 0 },
      /** Unit fee (per guest or per table — see selectionFeeMode). Default $2. */
      perGuestFeeCents: { type: Number, min: 0 },
      selectionFeeMode: { type: String, enum: ['per_guest', 'per_table'], default: 'per_guest' },
      /**
       * restaurant = invoice on completion; diner = charged at booking;
       * combined = diner pays platform + restaurant fees; diner_share = diner pays
       * restaurant fee and platform fee is invoiced to the restaurant.
       */
      selectionFeePayer: {
        type: String,
        enum: ['restaurant', 'diner', 'combined', 'diner_share'],
        default: 'restaurant',
      },
    },
    planOverrides: {
      type: Map,
      of: planOverrideSchema,
      default: {},
    },
    /** Built-in plan keys removed from the public catalog. Overrides stay so existing subscriptions still resolve. */
    deletedPlanKeys: { type: [String], default: [] },
    /** Catalog display order. Empty means built-ins first, then custom packages. */
    planOrder: { type: [String], default: [] },
    annualBilling: {
      enabled: { type: Boolean, default: true },
      scope: { type: String, enum: ['all', 'selected'], default: 'all' },
      planKeys: { type: [String], default: [] },
      discountType: { type: String, enum: ['months_free', 'percent_off'], default: 'months_free' },
      freeMonths: { type: Number, default: 2, min: 1, max: 11 },
      discountPercent: { type: Number, default: 17, min: 1, max: 99 },
    },
    loyalty: { type: loyaltyProgramSchema, default: undefined },
  },
  { timestamps: true },
);

type PlatformConfigFields = InferSchemaType<typeof platformConfigSchema>;

export type PlatformConfigDocument = HydratedDocument<PlatformConfigFields>;

export const PlatformConfig: Model<PlatformConfigFields> =
  mongoose.models.PlatformConfig ??
  mongoose.model<PlatformConfigFields>('PlatformConfig', platformConfigSchema);

export const PLAN_FEATURE_KEYS = FEATURE_KEYS;
