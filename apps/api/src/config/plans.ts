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
  'preShift',
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

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  floorPlans: 'Customizable floor plans',
  smartAssign: 'Smart Assign',
  waitlist: 'Waitlist',
  premiumSms: 'Premium SMS messaging',
  guestProfiles360: '360 guest profiles',
  emailCampaigns: 'Automated email campaigns',
  customWidget: 'Customizable booking widget',
  analytics: 'Advanced analytics',
  dedicatedSupport: 'Dedicated account manager',
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
