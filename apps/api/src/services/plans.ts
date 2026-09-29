import { Subscription } from '../models/Subscription.js';
import { FEATURE_LABELS, type FeatureKey, type PlanFeatures } from '../config/plans.js';
import { getEffectivePlan, isFeatureEnabled } from './platformConfig.js';
import { PlanFeatureError } from '../lib/errors.js';
import { applyPendingPlanChangeIfDue } from './planChange.js';

/**
 * Effective feature set for a restaurant. Restaurants without an active
 * subscription fall back to the Basic feature set.
 * When the platform SMS kill switch is off, premiumSms / premiumSmsAddon are forced false.
 */
export async function getFeatures(restaurantId: string): Promise<PlanFeatures & { premiumSmsAddon?: boolean }> {
  const basic = await getEffectivePlan('basic');
  const basicFeatures = basic?.features ?? ({} as PlanFeatures);
  const sub = await Subscription.findOne({ restaurantId });
  const smsEnabled = await isFeatureEnabled('sms');
  if (!sub || sub.status === 'cancelled' || sub.status === 'paused') {
    return {
      ...basicFeatures,
      ...(smsEnabled ? {} : { premiumSms: false, premiumSmsAddon: false }),
    };
  }
  await applyPendingPlanChangeIfDue(sub);
  const plan = await getEffectivePlan(sub.plan);
  const planFeatures = plan?.features ?? basicFeatures;
  const stored = (sub.features ?? {}) as unknown as PlanFeatures & { premiumSmsAddon?: boolean };
  const features: PlanFeatures & { premiumSmsAddon?: boolean } = {
    ...planFeatures,
    premiumSmsAddon: Boolean(stored.premiumSmsAddon),
  };
  if (!smsEnabled) {
    features.premiumSms = false;
    features.premiumSmsAddon = false;
  }
  return features;
}

export async function requireFeature(restaurantId: string, feature: FeatureKey) {
  const features = await getFeatures(restaurantId);
  if (feature === 'premiumSms' && features.premiumSmsAddon) return;
  if (!features[feature]) {
    throw new PlanFeatureError(
      `${FEATURE_LABELS[feature] ?? feature} is not included in your current plan. Upgrade to unlock it.`,
    );
  }
}

/** Whether SMS sending is available (platform SMS on + Pro plan or Core + add-on). */
export async function hasPremiumSms(restaurantId: string): Promise<boolean> {
  if (!(await isFeatureEnabled('sms'))) return false;
  const features = await getFeatures(restaurantId);
  return Boolean(features.premiumSms || features.premiumSmsAddon);
}
