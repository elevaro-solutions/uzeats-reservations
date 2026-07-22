export const ANNUAL_BILLING_SCOPES = ['all', 'selected'] as const;
export type AnnualBillingScope = (typeof ANNUAL_BILLING_SCOPES)[number];

export const ANNUAL_BILLING_DISCOUNT_TYPES = ['months_free', 'percent_off'] as const;
export type AnnualBillingDiscountType = (typeof ANNUAL_BILLING_DISCOUNT_TYPES)[number];

export interface AnnualBillingSettings {
  enabled: boolean;
  scope: AnnualBillingScope;
  planKeys: string[];
  discountType: AnnualBillingDiscountType;
  freeMonths: number;
  discountPercent: number;
}

export const DEFAULT_ANNUAL_BILLING: AnnualBillingSettings = {
  enabled: true,
  scope: 'all',
  planKeys: [],
  discountType: 'months_free',
  freeMonths: 2,
  discountPercent: 17,
};

export function normalizeAnnualBillingSettings(
  input?: Partial<AnnualBillingSettings> | null,
): AnnualBillingSettings {
  if (!input) return { ...DEFAULT_ANNUAL_BILLING };
  return {
    enabled: input.enabled !== false,
    scope: input.scope === 'selected' ? 'selected' : 'all',
    planKeys: Array.isArray(input.planKeys) ? input.planKeys.map((k) => String(k).trim()).filter(Boolean) : [],
    discountType: input.discountType === 'percent_off' ? 'percent_off' : 'months_free',
    freeMonths: Math.min(11, Math.max(1, input.freeMonths ?? DEFAULT_ANNUAL_BILLING.freeMonths)),
    discountPercent: Math.min(
      99,
      Math.max(1, input.discountPercent ?? DEFAULT_ANNUAL_BILLING.discountPercent),
    ),
  };
}

export function annualBillingAppliesToPlan(
  planKey: string,
  settings: AnnualBillingSettings,
): boolean {
  if (!settings.enabled) return false;
  if (settings.scope === 'all') return true;
  return settings.planKeys.includes(planKey);
}

export function getAnnualSavingsPercentFromSettings(settings: AnnualBillingSettings): number {
  if (!settings.enabled) return 0;
  if (settings.discountType === 'percent_off') return settings.discountPercent;
  return Math.round((settings.freeMonths / 12) * 100);
}

export interface PlanForBillingPeriodOptions {
  annualBilling?: AnnualBillingSettings | null;
  planKey?: string;
}
