import type { UserRole } from '@reservations/shared';
import {
  resolvePlanPricing,
  type PlanDiscountType,
} from '@reservations/shared';
import {
  FEATURE_KEYS,
  PLANS,
  type FeatureKey,
  type PlanFeatures,
  type PlanKey,
} from '../config/plans.js';
import { PlatformConfig, type PlatformConfigDocument } from '../models/PlatformConfig.js';

export type EffectivePlan = {
  key: string;
  name: string;
  description: string | null;
  monthlyPriceCents: number;
  originalMonthlyPriceCents: number | null;
  discountType: PlanDiscountType;
  discountPercent: number | null;
  annualFreeMonths: number | null;
  networkCoverFeeCents: number;
  websiteCoverFeeCents: number;
  trialDays: number;
  visibleOnPricing: boolean;
  isCustom: boolean;
  features: PlanFeatures;
};

export type PlanOverrideFields = {
  name?: string;
  description?: string | null;
  monthlyPriceCents?: number;
  originalMonthlyPriceCents?: number | null;
  discountType?: PlanDiscountType | string;
  discountPercent?: number | null;
  annualFreeMonths?: number | null;
  networkCoverFeeCents?: number;
  websiteCoverFeeCents?: number;
  trialDays?: number;
  visibleOnPricing?: boolean;
  features?: Record<string, boolean> | Map<string, boolean>;
};

const BUILTIN_KEYS = Object.keys(PLANS) as PlanKey[];
export const BUILTIN_PLAN_KEYS = new Set<string>(BUILTIN_KEYS);

const DEFAULTS = {
  supportEmail: 'support@reservations.local',
  supportPhone: '',
  defaultSignupRole: 'diner' as UserRole,
  defaultPartnerRole: 'restaurant_owner' as UserRole,
  defaultStaffRole: 'staff' as UserRole,
  maintenanceMode: false,
  allowPublicRegistration: true,
  allowPartnerRegistration: true,
  requireAdminDelete2FA: true,
  invoicePrefix: 'INV',
  currency: 'usd',
  featureFlags: {
    waitlist: true,
    deposits: true,
    partnerRegistration: true,
    publicRegistration: true,
    messaging: true,
    reviews: true,
    experiences: true,
    campaigns: true,
    widget: true,
  },
};

function emptyFeatures(): PlanFeatures {
  return Object.fromEntries(FEATURE_KEYS.map((k) => [k, false])) as PlanFeatures;
}

function mergeFeatures(
  base: PlanFeatures,
  override?: Record<string, boolean> | Map<string, boolean> | null,
): PlanFeatures {
  if (!override) return { ...base };
  const merged = { ...base };
  const entries =
    override instanceof Map ? [...override.entries()] : Object.entries(override);
  for (const [key, value] of entries) {
    if (FEATURE_KEYS.includes(key as FeatureKey) && typeof value === 'boolean') {
      merged[key as FeatureKey] = value;
    }
  }
  return merged;
}

export function pickDiscountOverrides(input: {
  discountType?: string | null;
  discountPercent?: number | null;
  annualFreeMonths?: number | null;
  originalMonthlyPriceCents?: number | null;
  monthlyPriceCents?: number;
}) {
  const discountType = input.discountType ?? 'none';
  if (discountType === 'none') {
    return {
      discountType: 'none' as const,
      discountPercent: null,
      annualFreeMonths: null,
      originalMonthlyPriceCents: null,
    };
  }
  return {
    discountType,
    ...(input.discountPercent !== undefined ? { discountPercent: input.discountPercent } : {}),
    ...(input.annualFreeMonths !== undefined ? { annualFreeMonths: input.annualFreeMonths } : {}),
    ...(input.originalMonthlyPriceCents !== undefined
      ? { originalMonthlyPriceCents: input.originalMonthlyPriceCents }
      : {}),
  };
}

export function getPlanOverridesMap(
  doc: PlatformConfigDocument,
): Record<string, PlanOverrideFields> {
  const raw = (doc as any).planOverrides;
  if (!raw) return {};
  if (raw instanceof Map) return Object.fromEntries(raw.entries());
  if (typeof raw === 'object') return { ...raw };
  return {};
}

export function slugifyPlanKey(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
  return base || 'plan';
}

export function uniquePlanKey(name: string, existingKeys: Set<string>): string {
  const base = slugifyPlanKey(name);
  if (!existingKeys.has(base)) return base;
  let i = 2;
  while (existingKeys.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

export async function getPlatformConfig(): Promise<PlatformConfigDocument> {
  let doc = await PlatformConfig.findOne({ key: 'default' });
  if (!doc) {
    doc = await PlatformConfig.create({ key: 'default', ...DEFAULTS });
  }
  return doc;
}

function mapOverrideToPlan(
  key: string,
  override: PlanOverrideFields | undefined,
  base?: (typeof PLANS)[PlanKey],
): EffectivePlan {
  const isCustom = !BUILTIN_PLAN_KEYS.has(key);
  const baseMonthly = override?.monthlyPriceCents ?? base?.monthlyPriceCents ?? 0;
  const pricing = resolvePlanPricing({
    monthlyPriceCents: baseMonthly,
    originalMonthlyPriceCents: override?.originalMonthlyPriceCents ?? null,
    discountType: override?.discountType ?? 'none',
    discountPercent: override?.discountPercent ?? null,
    annualFreeMonths: override?.annualFreeMonths ?? null,
  });
  return {
    key,
    name: override?.name ?? base?.name ?? key,
    description: override?.description ?? null,
    monthlyPriceCents: pricing.monthlyPriceCents,
    originalMonthlyPriceCents: pricing.originalMonthlyPriceCents,
    discountType: pricing.discountType,
    discountPercent: pricing.discountPercent,
    annualFreeMonths: pricing.annualFreeMonths,
    networkCoverFeeCents: override?.networkCoverFeeCents ?? base?.networkCoverFeeCents ?? 0,
    websiteCoverFeeCents: override?.websiteCoverFeeCents ?? base?.websiteCoverFeeCents ?? 0,
    trialDays: override?.trialDays ?? base?.trialDays ?? 0,
    visibleOnPricing:
      override?.visibleOnPricing !== undefined
        ? Boolean(override.visibleOnPricing)
        : true,
    isCustom,
    features: mergeFeatures(base?.features ?? emptyFeatures(), override?.features),
  };
}

export async function getEffectivePlans(): Promise<EffectivePlan[]> {
  const config = await getPlatformConfig();
  const overrides = getPlanOverridesMap(config);

  const plans: EffectivePlan[] = BUILTIN_KEYS.map((key) =>
    mapOverrideToPlan(key, overrides[key], PLANS[key]),
  );

  for (const [key, override] of Object.entries(overrides)) {
    if (BUILTIN_PLAN_KEYS.has(key)) continue;
    if (!override || typeof override !== 'object') continue;
    plans.push(mapOverrideToPlan(key, override));
  }

  return plans;
}

export async function getEffectivePlan(planKey: string): Promise<EffectivePlan | null> {
  const plans = await getEffectivePlans();
  return plans.find((p) => p.key === planKey) ?? null;
}

export function mapPlatformConfig(doc: PlatformConfigDocument) {
  const flags = (doc.featureFlags as any) ?? {};
  return {
    id: doc._id.toString(),
    supportEmail: doc.supportEmail ?? DEFAULTS.supportEmail,
    supportPhone: doc.supportPhone ?? DEFAULTS.supportPhone,
    defaultSignupRole: doc.defaultSignupRole ?? DEFAULTS.defaultSignupRole,
    defaultPartnerRole: doc.defaultPartnerRole ?? DEFAULTS.defaultPartnerRole,
    defaultStaffRole: doc.defaultStaffRole ?? DEFAULTS.defaultStaffRole,
    maintenanceMode: Boolean(doc.maintenanceMode),
    allowPublicRegistration: doc.allowPublicRegistration !== false,
    allowPartnerRegistration: doc.allowPartnerRegistration !== false,
    requireAdminDelete2FA: doc.requireAdminDelete2FA !== false,
    invoicePrefix: doc.invoicePrefix ?? DEFAULTS.invoicePrefix,
    currency: doc.currency ?? DEFAULTS.currency,
    featureFlags: {
      waitlist: flags.waitlist !== false,
      deposits: flags.deposits !== false,
      partnerRegistration: flags.partnerRegistration !== false,
      publicRegistration: flags.publicRegistration !== false,
      messaging: flags.messaging !== false,
      reviews: flags.reviews !== false,
      experiences: flags.experiences !== false,
      campaigns: flags.campaigns !== false,
      widget: flags.widget !== false,
    },
    updatedAt: (doc as any).updatedAt ?? new Date(),
  };
}

export async function isFeatureEnabled(
  flag: keyof typeof DEFAULTS.featureFlags,
): Promise<boolean> {
  const config = await getPlatformConfig();
  const mapped = mapPlatformConfig(config);
  return mapped.featureFlags[flag] !== false;
}
