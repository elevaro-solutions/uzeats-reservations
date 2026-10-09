import type { UserRole } from '@reservations/shared';
import {
  resolvePlanPricing,
  normalizeAnnualBillingSettings,
  resolveCancellationPeriodHours,
  VIRTUAL_ROOM_DEFAULT_MONTHLY_PRICE_CENTS,
  VIRTUAL_ROOM_DEFAULT_PER_GUEST_FEE_CENTS,
  type AnnualBillingSettings,
  type PlanDiscountType,
} from '@reservations/shared';
import { env } from '../config/env.js';
import {
  DEFAULT_MANAGER_SEATS,
  DEFAULT_PLAN_HIGHLIGHTS,
  FEATURE_KEYS,
  PLANS,
  normalizeManagerSeats,
  sanitizePlanHighlights,
  type FeatureKey,
  type PlanFeatures,
  type PlanKey,
} from '../config/plans.js';
import { PlatformConfig, type PlatformConfigDocument } from '../models/PlatformConfig.js';
import {
  getStripeClientConfig,
  isStripeModeConfigured,
  resolveStripeMode,
  setActiveStripeMode,
  type StripeMode,
} from './stripe.js';

/** Unset config falls back to on in production, off in local/test. */
export function defaultRequireSignupEmailVerification() {
  return env.NODE_ENV === 'production';
}

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
  /** Public pricing card “Includes” lines. */
  highlights: string[];
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
  highlights?: string[] | null;
  features?: Record<string, boolean> | Map<string, boolean>;
};

const BUILTIN_KEYS = Object.keys(PLANS) as PlanKey[];
export const BUILTIN_PLAN_KEYS = new Set<string>(BUILTIN_KEYS);

function buildDefaults() {
  return {
    supportEmail: 'support@tablevera.online',
    supportPhone: '+16507707788',
    defaultSignupRole: 'diner' as UserRole,
    defaultPartnerRole: 'restaurant_owner' as UserRole,
    defaultManagerRole: 'manager' as UserRole,
    maintenanceMode: false,
    allowPublicRegistration: true,
    allowPartnerRegistration: true,
    requireAdminDelete2FA: true,
    requireSignupEmailVerification: defaultRequireSignupEmailVerification(),
    invoicePrefix: 'INV',
    currency: 'usd',
    cancellationPeriodHours: 24,
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
      sms: true,
      virtualRoom3d: false,
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
}

const DEFAULTS = buildDefaults();

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
    try {
      doc = await PlatformConfig.create({ key: 'default', ...buildDefaults() });
    } catch (err) {
      if ((err as { code?: number })?.code !== 11000) throw err;
      doc = await PlatformConfig.findOne({ key: 'default' });
      if (!doc) throw err;
    }
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
    highlights: Array.isArray(override?.highlights)
      ? sanitizePlanHighlights(override.highlights)
      : [...(DEFAULT_PLAN_HIGHLIGHTS[key] ?? [])],
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

/**
 * Catalog after soft-delete. Pricing-hidden plans (`visibleOnPricing: false`) stay here;
 * the `plans` GraphQL resolver strips them for non-admins so partners/public never see them.
 */
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

export type VirtualRoomPricing = {
  monthlyPriceCents: number;
  /** Unit fee in cents; applied per guest or per table based on selectionFeeMode. */
  perGuestFeeCents: number;
  selectionFeeMode: 'per_guest' | 'per_table';
  /**
   * restaurant | diner | combined (diner pays both) |
   * diner_share (diner pays restaurant fee; platform cut invoiced to restaurant).
   */
  selectionFeePayer: 'restaurant' | 'diner' | 'combined' | 'diner_share';
};

function priceOrDefault(value: unknown, fallback: number) {
  const n = typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

function mapSelectionFeePayer(
  value: unknown,
): VirtualRoomPricing['selectionFeePayer'] {
  if (value === 'diner' || value === 'combined' || value === 'diner_share') return value;
  return 'restaurant';
}

export function mapVirtualRoomPricing(doc: PlatformConfigDocument): VirtualRoomPricing {
  const raw = (doc as { virtualRoomPricing?: Partial<VirtualRoomPricing> }).virtualRoomPricing;
  const mode = raw?.selectionFeeMode === 'per_table' ? 'per_table' : 'per_guest';
  return {
    monthlyPriceCents: priceOrDefault(raw?.monthlyPriceCents, VIRTUAL_ROOM_DEFAULT_MONTHLY_PRICE_CENTS),
    perGuestFeeCents: priceOrDefault(raw?.perGuestFeeCents, VIRTUAL_ROOM_DEFAULT_PER_GUEST_FEE_CENTS),
    selectionFeeMode: mode,
    selectionFeePayer: mapSelectionFeePayer(raw?.selectionFeePayer),
  };
}

export function applyVirtualRoomPricing(
  doc: PlatformConfigDocument,
  input: Partial<VirtualRoomPricing>,
) {
  const current = mapVirtualRoomPricing(doc);
  (doc as { virtualRoomPricing?: VirtualRoomPricing }).virtualRoomPricing = {
    monthlyPriceCents: input.monthlyPriceCents ?? current.monthlyPriceCents,
    perGuestFeeCents: input.perGuestFeeCents ?? current.perGuestFeeCents,
    selectionFeeMode: input.selectionFeeMode ?? current.selectionFeeMode,
    selectionFeePayer: input.selectionFeePayer ?? current.selectionFeePayer,
  };
  doc.markModified('virtualRoomPricing');
}
export async function getVirtualRoomPricing(): Promise<VirtualRoomPricing> {
  return mapVirtualRoomPricing(await getPlatformConfig());
}

export function resolveRequireSignupEmailVerification(
  value: boolean | null | undefined,
): boolean {
  if (value === undefined || value === null) {
    return defaultRequireSignupEmailVerification();
  }
  return Boolean(value);
}

export function mapPlatformConfig(doc: PlatformConfigDocument) {
  const flags = (doc.featureFlags as any) ?? {};
  const stripeMode = resolveStripeMode((doc as any).stripeMode);
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
    requireSignupEmailVerification: resolveRequireSignupEmailVerification(
      doc.requireSignupEmailVerification,
    ),
    invoicePrefix: doc.invoicePrefix ?? DEFAULTS.invoicePrefix,
    currency: doc.currency ?? DEFAULTS.currency,
    cancellationPeriodHours: resolveCancellationPeriodHours([
      (doc as { cancellationPeriodHours?: number | null }).cancellationPeriodHours,
    ]),
    stripeMode,
    stripeSandboxConfigured: isStripeModeConfigured('test'),
    stripeProductionConfigured: isStripeModeConfigured('live'),
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
      sms: flags.sms !== false,
      virtualRoom3d: flags.virtualRoom3d === true,
    },
    virtualRoomPricing: mapVirtualRoomPricing(doc),
    annualBilling: mapAnnualBillingSettings(doc),
    updatedAt: (doc as any).updatedAt ?? new Date(),
  };
}

/** Load PlatformConfig.stripeMode into the process-local Stripe client cache. */
export async function initStripeModeFromConfig() {
  const doc = await getPlatformConfig();
  setActiveStripeMode(resolveStripeMode((doc as any).stripeMode));
}

export function applyStripeModeToConfig(
  doc: PlatformConfigDocument,
  mode: StripeMode,
) {
  if (mode !== 'test' && mode !== 'live') {
    throw new Error('Invalid stripeMode: must be test or live');
  }
  if (mode === 'live' && !isStripeModeConfigured('live')) {
    throw new Error(
      'Production Stripe keys are not configured. Set STRIPE_SECRET_KEY_LIVE (or a live STRIPE_SECRET_KEY).',
    );
  }
  if (mode === 'test' && !isStripeModeConfigured('test')) {
    throw new Error(
      'Sandbox Stripe keys are not configured. Set STRIPE_SECRET_KEY_TEST (or a test STRIPE_SECRET_KEY).',
    );
  }
  (doc as any).stripeMode = mode;
  setActiveStripeMode(mode);
}

export { getStripeClientConfig };

export async function isFeatureEnabled(
  flag: keyof typeof DEFAULTS.featureFlags,
): Promise<boolean> {
  const config = await getPlatformConfig();
  const mapped = mapPlatformConfig(config);
  return mapped.featureFlags[flag] !== false;
}

/** Mentions of SMS in package marketing copy (descriptions / includes). */
const SMS_WORD_RE = /\bsms\b/i;

/** Soft-strip trailing “and SMS” / inline SMS from a single marketing line. */
export function stripSmsFromCopy(text: string): string {
  return text
    .replace(/\s*,\s*and\s+SMS\b\.?/gi, '')
    .replace(/\s+and\s+SMS\b\.?/gi, '')
    .replace(/\bSMS\s*[,&]?\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

export function stripSmsFromHighlights(highlights: string[]): string[] {
  return highlights
    .filter((line) => !SMS_WORD_RE.test(line))
    .map((line) => stripSmsFromCopy(line))
    .filter((line) => line.length > 0);
}

/** Hide Premium SMS from partner/public plan payloads when the platform kill switch is off. */
export function gatePlanSmsForClients<
  T extends {
    features: PlanFeatures;
    description: string | null;
    highlights: string[];
  },
>(plan: T, smsEnabled: boolean): T {
  if (smsEnabled) return plan;
  return {
    ...plan,
    description: plan.description ? stripSmsFromCopy(plan.description) : null,
    highlights: stripSmsFromHighlights(plan.highlights ?? []),
    features: { ...plan.features, premiumSms: false },
  };
}

export async function isSignupEmailVerificationRequired(): Promise<boolean> {
  const config = await getPlatformConfig();
  return mapPlatformConfig(config).requireSignupEmailVerification;
}
