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

/** Minimum manager seats every package must include (owner-invited `manager` accounts). */
export const DEFAULT_MANAGER_SEATS = 1;

/** Launch pricing — early-stage SaaS rates (raise as we grow). */
export const PLANS = {
  basic: {
    name: 'Basic',
    monthlyPriceCents: 4900,
    networkCoverFeeCents: 50,
    websiteCoverFeeCents: 10,
    trialDays: 30,
    /** Owner-invited manager seats included with the package. */
    managerSeats: 1,
    features: features(['boostCampaigns']),
  },
  core: {
    name: 'Core',
    monthlyPriceCents: 9900,
    networkCoverFeeCents: 50,
    websiteCoverFeeCents: 0,
    trialDays: 30,
    managerSeats: 3,
    features: features(CORE_FEATURES),
  },
  pro: {
    name: 'Pro',
    monthlyPriceCents: 19900,
    networkCoverFeeCents: 25,
    websiteCoverFeeCents: 0,
    trialDays: 30,
    managerSeats: 5,
    features: features(PRO_FEATURES),
  },
} as const;

/** Clamp package manager seats to a positive integer (packages always include ≥1). */
export function normalizeManagerSeats(value: unknown, fallback = DEFAULT_MANAGER_SEATS): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return Math.max(DEFAULT_MANAGER_SEATS, fallback);
  return Math.max(DEFAULT_MANAGER_SEATS, Math.min(100, Math.floor(n)));
}

export type PlanKey = keyof typeof PLANS;

/** Default “Includes” lines on the public pricing cards until a super admin overrides them. */
export const DEFAULT_PLAN_HIGHLIGHTS: Record<string, string[]> = {
  basic: [
    'Tablevera listing & booking widget',
    'Deposits & no-show fees',
    'Review management',
    'Google Reserve integration',
  ],
  core: [
    'Floor plans & Smart Assign',
    'Free website reservations',
    'In-house and online waitlist',
    '360° guest profiles',
  ],
  pro: [
    'Advanced guest insights',
    'Revenue forecasting',
    'Custom report builder',
    'Dedicated account manager',
  ],
};

const MAX_PLAN_HIGHLIGHTS = 12;
const MAX_HIGHLIGHT_LENGTH = 140;

/** Trim, drop blanks, and cap the public Includes list. An empty array is kept. */
export function sanitizePlanHighlights(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const item of value) {
    const line = String(item).replace(/\s+/g, ' ').trim().slice(0, MAX_HIGHLIGHT_LENGTH);
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
    if (lines.length >= MAX_PLAN_HIGHLIGHTS) break;
  }
  return lines;
}

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
