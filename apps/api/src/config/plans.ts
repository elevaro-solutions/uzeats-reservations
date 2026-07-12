export const FEATURE_KEYS = [
  'floorPlans',
  'smartAssign',
  'waitlist',
  'premiumSms',
  'guestProfiles360',
  'emailCampaigns',
  'customWidget',
  'analytics',
  'dedicatedSupport',
  'accessRules',
  'posIntegration',
  'twoWayMessaging',
  'spendAlerts',
  'ticketedEvents',
  'preShift',
  'autoTags',
  'surveys',
  'revenueForecasting',
  'customReports',
  'multiLocationAnalytics',
  'promotions',
  'featuredPlacement',
  'boostCampaigns',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type PlanFeatures = Record<FeatureKey, boolean>;

function features(enabled: FeatureKey[]): PlanFeatures {
  const map = Object.fromEntries(FEATURE_KEYS.map((k) => [k, false])) as PlanFeatures;
  for (const key of enabled) map[key] = true;
  return map;
}

const CORE_FEATURES: FeatureKey[] = [
  'floorPlans',
  'smartAssign',
  'waitlist',
  'guestProfiles360',
  'analytics',
  'accessRules',
  'posIntegration',
  'twoWayMessaging',
  'spendAlerts',
  'ticketedEvents',
  'featuredPlacement',
  'boostCampaigns',
];

const PRO_FEATURES: FeatureKey[] = [
  ...CORE_FEATURES,
  'premiumSms',
  'emailCampaigns',
  'customWidget',
  'dedicatedSupport',
  'preShift',
  'autoTags',
  'surveys',
  'revenueForecasting',
  'customReports',
  'multiLocationAnalytics',
  'promotions',
];

/** Launch pricing — early-stage SaaS rates (raise as we grow). */
export const PLANS = {
  basic: {
    name: 'Basic',
    monthlyPriceCents: 4900,
    networkCoverFeeCents: 50,
    websiteCoverFeeCents: 10,
    trialDays: 30,
    features: features(['boostCampaigns']),
  },
  core: {
    name: 'Core',
    monthlyPriceCents: 9900,
    networkCoverFeeCents: 50,
    websiteCoverFeeCents: 0,
    trialDays: 30,
    features: features(CORE_FEATURES),
  },
  pro: {
    name: 'Pro',
    monthlyPriceCents: 19900,
    networkCoverFeeCents: 25,
    websiteCoverFeeCents: 0,
    trialDays: 30,
    features: features(PRO_FEATURES),
  },
} as const;

export type PlanKey = keyof typeof PLANS;
