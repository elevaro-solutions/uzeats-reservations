import type { UserRole } from '@reservations/shared';
import {
  resolvePlanPricing,
  normalizeAnnualBillingSettings,
  type AnnualBillingSettings,
  type PlanDiscountType,
} from '@reservations/shared';
import {
  DEFAULT_MANAGER_SEATS,
  FEATURE_KEYS,
  PLANS,
  normalizeManagerSeats,
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
  discountAmountCents: number | null;
  annualFreeMonths: number | null;
  networkCoverFeeCents: number;
  websiteCoverFeeCents: number;
  trialDays: number;
  /** Owner-invited manager seats included (≥1). */
  managerSeats: number;
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
  discountAmountCents?: number | null;
  annualFreeMonths?: number | null;
  networkCoverFeeCents?: number;
  websiteCoverFeeCents?: number;
  trialDays?: number;
  managerSeats?: number;
  visibleOnPricing?: boolean;
  features?: Record<string, boolean> | Map<string, boolean>;
};

const BUILTIN_KEYS = Object.keys(PLANS) as PlanKey[];
export const BUILTIN_PLAN_KEYS = new Set<string>(BUILTIN_KEYS);

const DEFAULTS = {
  supportEmail: 'support@tablevera.online',
  supportPhone: '+16507707788',
  defaultSignupRole: 'diner' as UserRole,
  defaultPartnerRole: 'restaurant_owner' as UserRole,
  defaultManagerRole: 'manager' as UserRole,
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
  annualBilling: {
    enabled: true,
    scope: 'all' as const,
    planKeys: [] as string[],
    discountType: 'months_free' as const,
    freeMonths: 2,
    discountPercent: 17,
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
  discountAmountCents?: number | null;
  annualFreeMonths?: number | null;
  originalMonthlyPriceCents?: number | null;
  monthlyPriceCents?: number;
}) {
  const discountType = input.discountType ?? 'none';
  if (discountType === 'none') {
    return {
      discountType: 'none' as const,
      discountPercent: null,
      discountAmountCents: null,
      annualFreeMonths: null,
      originalMonthlyPriceCents: null,
    };
  }
  return {
    discountType,
    ...(input.discountPercent !== undefined ? { discountPercent: input.discountPercent } : {}),
    ...(input.discountAmountCents !== undefined
      ? { discountAmountCents: input.discountAmountCents }
      : {}),
    ...(input.annualFreeMonths !== undefined ? { annualFreeMonths: input.annualFreeMonths } : {}),
    ...(input.originalMonthlyPriceCents !== undefined
      ? { originalMonthlyPriceCents: input.originalMonthlyPriceCents }
      : {}),
  };
}

export function toPlainPlanOverride(value: unknown): PlanOverrideFields {
  if (!value || typeof value !== 'object') return {};
  if (typeof (value as { toObject?: () => unknown }).toObject === 'function') {
    return (value as { toObject: () => PlanOverrideFields }).toObject();
  }
  return { ...(value as PlanOverrideFields) };
}

export function getPlanOverridesMap(
  doc: PlatformConfigDocument,
): Record<string, PlanOverrideFields> {
  const raw = (doc as any).planOverrides;
  if (!raw) return {};
  const entries =
    raw instanceof Map
      ? [...raw.entries()]
      : typeof raw === 'object'
        ? Object.entries(raw)
        : [];
  return Object.fromEntries(
    entries.map(([key, value]) => [key, toPlainPlanOverride(value)]),
  );
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
    discountAmountCents: override?.discountAmountCents ?? null,
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
    discountAmountCents: pricing.discountAmountCents,
    annualFreeMonths: pricing.annualFreeMonths,
    networkCoverFeeCents: override?.networkCoverFeeCents ?? base?.networkCoverFeeCents ?? 0,
    websiteCoverFeeCents: override?.websiteCoverFeeCents ?? base?.websiteCoverFeeCents ?? 0,
    trialDays:
      typeof override?.trialDays === 'number' ? override.trialDays : (base?.trialDays ?? 0),
    managerSeats: normalizeManagerSeats(
      override?.managerSeats ??
        (base as { managerSeats?: number } | undefined)?.managerSeats ??
        DEFAULT_MANAGER_SEATS,
    ),
    visibleOnPricing:
      override?.visibleOnPricing !== undefined
        ? Boolean(override.visibleOnPricing)
        : true,
    isCustom,
    features: mergeFeatures(base?.features ?? emptyFeatures(), override?.features),
  };
}

/** Every defined package, including built-ins hidden from the catalog. */
export function assemblePlans(
  overrides: Record<string, PlanOverrideFields>,
): EffectivePlan[] {
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

export function getDeletedPlanKeys(doc: PlatformConfigDocument): Set<string> {
  const raw = (doc as { deletedPlanKeys?: unknown }).deletedPlanKeys;
  if (!Array.isArray(raw)) return new Set();
  return new Set(
    raw
      .map((key) => String(key).trim().toLowerCase())
      .filter((key) => key.length > 0),
  );
}

/** Catalog shown on pricing, signup, and admin package lists. */
export function visiblePlans(
  plans: EffectivePlan[],
  deletedKeys: Set<string>,
): EffectivePlan[] {
  return plans.filter((plan) => !deletedKeys.has(plan.key));
}

export function getPlanOrder(doc: PlatformConfigDocument): string[] {
  const raw = (doc as { planOrder?: unknown }).planOrder;
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const item of raw) {
    const key = String(item).trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

/** Apply a saved order. Keys missing from `planOrder` stay at the end, in their previous order. */
export function orderPlans<T extends { key: string }>(plans: T[], planOrder: string[]): T[] {
  if (!planOrder.length) return plans;
  const rank = new Map(planOrder.map((key, index) => [key, index]));
  return [...plans].sort((a, b) => {
    const ai = rank.get(a.key);
    const bi = rank.get(b.key);
    if (ai == null && bi == null) return 0;
    if (ai == null) return 1;
    if (bi == null) return -1;
    return ai - bi;
  });
}

/** Keep requested keys that exist, then append any catalog keys the client omitted. */
export function normalizePlanOrder(catalogKeys: string[], requested: string[]): string[] {
  const catalog = new Set(catalogKeys);
  const seen = new Set<string>();
  const next: string[] = [];
  for (const raw of requested) {
    const key = String(raw).trim().toLowerCase();
    if (!catalog.has(key) || seen.has(key)) continue;
    seen.add(key);
    next.push(key);
  }
  for (const key of catalogKeys) {
    if (!seen.has(key)) next.push(key);
  }
  return next;
}

export function setPlanOrder(doc: PlatformConfigDocument, keys: string[]): string[] {
  const catalog = visiblePlans(assemblePlans(getPlanOverridesMap(doc)), getDeletedPlanKeys(doc));
  const next = normalizePlanOrder(
    catalog.map((plan) => plan.key),
    keys,
  );
  (doc as { planOrder?: string[] }).planOrder = next;
  doc.markModified('planOrder');
  return next;
}

export function appendPlanToOrder(doc: PlatformConfigDocument, key: string) {
  const current = getPlanOrder(doc);
  if (!current.length || current.includes(key)) return;
  (doc as { planOrder?: string[] }).planOrder = [...current, key];
  doc.markModified('planOrder');
}

export function removePlanFromOrder(doc: PlatformConfigDocument, key: string) {
  const current = getPlanOrder(doc);
  if (!current.includes(key)) return;
  (doc as { planOrder?: string[] }).planOrder = current.filter((planKey) => planKey !== key);
  doc.markModified('planOrder');
}

export async function getEffectivePlans(): Promise<EffectivePlan[]> {
  const config = await getPlatformConfig();
  const catalog = visiblePlans(assemblePlans(getPlanOverridesMap(config)), getDeletedPlanKeys(config));
  return orderPlans(catalog, getPlanOrder(config));
}

export async function getEffectivePlan(planKey: string): Promise<EffectivePlan | null> {
  const config = await getPlatformConfig();
  const plans = assemblePlans(getPlanOverridesMap(config));
  return plans.find((p) => p.key === planKey) ?? null;
}

export function mapAnnualBillingSettings(doc: PlatformConfigDocument): AnnualBillingSettings {
  const raw = (doc as any).annualBilling ?? DEFAULTS.annualBilling;
  return normalizeAnnualBillingSettings({
    enabled: raw.enabled,
    scope: raw.scope,
    planKeys: Array.isArray(raw.planKeys) ? raw.planKeys : [],
    discountType: raw.discountType,
    freeMonths: raw.freeMonths,
    discountPercent: raw.discountPercent,
  });
}

export async function getAnnualBillingSettings(): Promise<AnnualBillingSettings> {
  const config = await getPlatformConfig();
  return mapAnnualBillingSettings(config);
}

export function mapPlatformConfig(doc: PlatformConfigDocument) {
  const flags = (doc.featureFlags as any) ?? {};
  return {
    id: doc._id.toString(),
    supportEmail: doc.supportEmail ?? DEFAULTS.supportEmail,
    supportPhone: doc.supportPhone ?? DEFAULTS.supportPhone,
    defaultSignupRole: doc.defaultSignupRole ?? DEFAULTS.defaultSignupRole,
    defaultPartnerRole: doc.defaultPartnerRole ?? DEFAULTS.defaultPartnerRole,
    defaultManagerRole: doc.defaultManagerRole ?? DEFAULTS.defaultManagerRole,
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
    annualBilling: mapAnnualBillingSettings(doc),
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
