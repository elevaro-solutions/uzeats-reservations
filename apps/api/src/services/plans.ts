import { Subscription } from '../models/Subscription.js';
import { type FeatureKey, type PlanFeatures } from '../config/plans.js';
import { getEffectivePlan } from './platformConfig.js';

const FEATURE_LABELS: Partial<Record<FeatureKey, string>> = {
  floorPlans: 'Customizable floor plans',
  smartAssign: 'Smart Assign',
  waitlist: 'Waitlist',
  premiumSms: 'Premium SMS messaging',
  guestProfiles360: '360 guest profiles',
  emailCampaigns: 'Automated email campaigns',
  customWidget: 'Customizable booking widget',
  analytics: 'Advanced analytics',
  accessRules: 'Access Rules',
  posIntegration: 'POS integration',
  twoWayMessaging: 'Two-way messaging',
  spendAlerts: 'Guest spend alerts',
  ticketedEvents: 'Ticketed events & experiences',
  preShift: 'Pre-shift reports',
  autoTags: 'Automated guest tags',
  surveys: 'Custom post-dining surveys',
  revenueForecasting: 'Revenue forecasting',
  customReports: 'Custom report builder',
  multiLocationAnalytics: 'Multi-location analytics',
  promotions: 'Promotion & offer management',
  featuredPlacement: 'Featured placement',
  boostCampaigns: 'Boost campaigns',
};

/**
 * Effective feature set for a restaurant. Restaurants without an active
 * subscription fall back to the Basic feature set.
 */
export async function getFeatures(restaurantId: string): Promise<PlanFeatures & { premiumSmsAddon?: boolean }> {
  const basic = await getEffectivePlan('basic');
  const basicFeatures = basic?.features ?? ({} as PlanFeatures);
  const sub = await Subscription.findOne({ restaurantId });
  if (!sub || sub.status === 'cancelled' || sub.status === 'paused') {
    return { ...basicFeatures };
  }
  const features = (sub.features ?? {}) as unknown as PlanFeatures & { premiumSmsAddon?: boolean };
  return { ...basicFeatures, ...JSON.parse(JSON.stringify(features)) };
}

export class PlanFeatureError extends Error {
  constructor(feature: FeatureKey) {
    super(
      `${FEATURE_LABELS[feature] ?? feature} is not included in your current plan. Upgrade to unlock it.`,
    );
    this.name = 'PlanFeatureError';
  }
}

export async function requireFeature(restaurantId: string, feature: FeatureKey) {
  const features = await getFeatures(restaurantId);
  if (feature === 'premiumSms' && features.premiumSmsAddon) return;
  if (!features[feature]) throw new PlanFeatureError(feature);
}

/** Whether SMS sending is available (Pro plan or Core + add-on). */
export async function hasPremiumSms(restaurantId: string): Promise<boolean> {
  const features = await getFeatures(restaurantId);
  return Boolean(features.premiumSms || features.premiumSmsAddon);
}
