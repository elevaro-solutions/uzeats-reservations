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
      enum: ['none', 'percent_off', 'first_month_free', 'annual_months_free'],
      default: 'none',
    },
    discountPercent: { type: Number, min: 0, max: 100 },
    annualFreeMonths: { type: Number, min: 0, max: 11 },
    networkCoverFeeCents: { type: Number },
    websiteCoverFeeCents: { type: Number },
    trialDays: { type: Number },
    visibleOnPricing: { type: Boolean, default: true },
    features: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const platformConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    supportEmail: { type: String, default: 'support@reservations.local' },
    supportPhone: { type: String, default: '' },
    defaultSignupRole: {
      type: String,
      enum: ['diner', 'restaurant_owner', 'staff', 'admin'],
      default: 'diner',
    },
    defaultPartnerRole: {
      type: String,
      enum: ['diner', 'restaurant_owner', 'staff', 'admin'],
      default: 'restaurant_owner',
    },
    defaultStaffRole: {
      type: String,
      enum: ['diner', 'restaurant_owner', 'staff', 'admin'],
      default: 'staff',
    },
    maintenanceMode: { type: Boolean, default: false },
    allowPublicRegistration: { type: Boolean, default: true },
    allowPartnerRegistration: { type: Boolean, default: true },
    requireAdminDelete2FA: { type: Boolean, default: true },
    invoicePrefix: { type: String, default: 'INV' },
    currency: { type: String, default: 'usd' },
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
    },
    planOverrides: {
      type: Map,
      of: planOverrideSchema,
      default: {},
    },
  },
  { timestamps: true },
);

type PlatformConfigFields = InferSchemaType<typeof platformConfigSchema>;

export type PlatformConfigDocument = HydratedDocument<PlatformConfigFields>;

export const PlatformConfig: Model<PlatformConfigFields> =
  mongoose.models.PlatformConfig ??
  mongoose.model<PlatformConfigFields>('PlatformConfig', platformConfigSchema);

export const PLAN_FEATURE_KEYS = FEATURE_KEYS;
