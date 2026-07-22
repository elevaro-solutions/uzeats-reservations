export const PLAN_DISCOUNT_TYPES = [
  'none',
  'percent_off',
  'first_month_free',
  'annual_months_free',
] as const;

export type PlanDiscountType = (typeof PLAN_DISCOUNT_TYPES)[number];

export interface PlanPricingFields {
  monthlyPriceCents: number;
  originalMonthlyPriceCents?: number | null;
  discountType?: PlanDiscountType | string | null;
  discountPercent?: number | null;
  annualFreeMonths?: number | null;
}

export function formatPlanDollars(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function computeDiscountedPriceCents(originalCents: number, percent: number): number {
  return Math.round((originalCents * (100 - percent)) / 100);
}

export function normalizeDiscountType(value?: string | null): PlanDiscountType {
  if (value && (PLAN_DISCOUNT_TYPES as readonly string[]).includes(value)) {
    return value as PlanDiscountType;
  }
  return 'none';
}

/** Resolve stored plan pricing fields into effective monthly/original cents. */
export function resolvePlanPricing(input: PlanPricingFields): {
  monthlyPriceCents: number;
  originalMonthlyPriceCents: number | null;
  discountType: PlanDiscountType;
  discountPercent: number | null;
  annualFreeMonths: number | null;
} {
  const discountType = normalizeDiscountType(input.discountType);
  const monthlyPriceCents = Math.max(0, input.monthlyPriceCents ?? 0);
  let originalMonthlyPriceCents =
    input.originalMonthlyPriceCents != null && input.originalMonthlyPriceCents > 0
      ? input.originalMonthlyPriceCents
      : null;
  const discountPercent =
    input.discountPercent != null && input.discountPercent > 0 ? input.discountPercent : null;
  const annualFreeMonths =
    input.annualFreeMonths != null && input.annualFreeMonths > 0 ? input.annualFreeMonths : null;

  if (discountType === 'percent_off' && originalMonthlyPriceCents && discountPercent) {
    return {
      monthlyPriceCents: computeDiscountedPriceCents(originalMonthlyPriceCents, discountPercent),
      originalMonthlyPriceCents,
      discountType,
      discountPercent,
      annualFreeMonths: null,
    };
  }

  if (discountType === 'first_month_free') {
    originalMonthlyPriceCents = originalMonthlyPriceCents ?? monthlyPriceCents;
    return {
      monthlyPriceCents,
      originalMonthlyPriceCents,
      discountType,
      discountPercent: null,
      annualFreeMonths: null,
    };
  }

  if (discountType === 'annual_months_free') {
    return {
      monthlyPriceCents,
      originalMonthlyPriceCents: null,
      discountType,
      discountPercent: null,
      annualFreeMonths,
    };
  }

  if (originalMonthlyPriceCents && originalMonthlyPriceCents > monthlyPriceCents) {
    return {
      monthlyPriceCents,
      originalMonthlyPriceCents,
      discountType: 'none',
      discountPercent: null,
      annualFreeMonths: null,
    };
  }

  return {
    monthlyPriceCents,
    originalMonthlyPriceCents: null,
    discountType: 'none',
    discountPercent: null,
    annualFreeMonths: null,
  };
}

export interface PlanPriceDisplay {
  primaryCents: number;
  primarySuffix: string;
  originalCents: number | null;
  showStrikethrough: boolean;
  discountTag: string | null;
  secondaryNote: string | null;
  savingsNote: string | null;
  annualFullCents: number | null;
  annualDiscountedCents: number | null;
  annualSavingsCents: number | null;
  annualSavingsPercent: number | null;
}

export function computeAnnualSavings(monthlyPriceCents: number, freeMonths: number) {
  const annualFullCents = monthlyPriceCents * 12;
  const annualDiscountedCents = monthlyPriceCents * Math.max(0, 12 - freeMonths);
  const annualSavingsCents = annualFullCents - annualDiscountedCents;
  const annualSavingsPercent =
    annualFullCents > 0 ? Math.round((annualSavingsCents / annualFullCents) * 100) : 0;
  return {
    annualFullCents,
    annualDiscountedCents,
    annualSavingsCents,
    annualSavingsPercent,
  };
}

export function formatAnnualSavingsNote(
  savingsCents: number,
  savingsPercent: number,
): string {
  return `Save ${formatPlanDollars(savingsCents)}/year (${savingsPercent}% off vs paying monthly)`;
}

export function getPlanPriceDisplay(plan: PlanPricingFields): PlanPriceDisplay {
  const resolved = resolvePlanPricing(plan);
  const emptySavings = {
    savingsNote: null as string | null,
    annualFullCents: null as number | null,
    annualDiscountedCents: null as number | null,
    annualSavingsCents: null as number | null,
    annualSavingsPercent: null as number | null,
  };

  switch (resolved.discountType) {
    case 'first_month_free':
      return {
        primaryCents: 0,
        primarySuffix: ' / first month',
        originalCents: resolved.originalMonthlyPriceCents,
        showStrikethrough: true,
        discountTag: '1st month free',
        secondaryNote: `then ${formatPlanDollars(resolved.monthlyPriceCents)}/mo`,
        ...emptySavings,
      };
    case 'percent_off':
      return {
        primaryCents: resolved.monthlyPriceCents,
        primarySuffix: ' / month',
        originalCents: resolved.originalMonthlyPriceCents,
        showStrikethrough: Boolean(
          resolved.originalMonthlyPriceCents &&
            resolved.originalMonthlyPriceCents > resolved.monthlyPriceCents,
        ),
        discountTag: resolved.discountPercent ? `${resolved.discountPercent}% off` : null,
        secondaryNote: null,
        ...emptySavings,
      };
    case 'annual_months_free': {
      const freeMonths = resolved.annualFreeMonths ?? 0;
      if (freeMonths <= 0) {
        return {
          primaryCents: resolved.monthlyPriceCents,
          primarySuffix: ' / month',
          originalCents: null,
          showStrikethrough: false,
          discountTag: null,
          secondaryNote: null,
          ...emptySavings,
        };
      }
      const annual = computeAnnualSavings(resolved.monthlyPriceCents, freeMonths);
      return {
        primaryCents: resolved.monthlyPriceCents,
        primarySuffix: ' / month',
        originalCents: annual.annualFullCents,
        showStrikethrough: true,
        discountTag: `${freeMonths} month${freeMonths === 1 ? '' : 's'} free on annual`,
        secondaryNote: `${formatPlanDollars(annual.annualDiscountedCents)}/year billed annually`,
        savingsNote: formatAnnualSavingsNote(
          annual.annualSavingsCents,
          annual.annualSavingsPercent,
        ),
        annualFullCents: annual.annualFullCents,
        annualDiscountedCents: annual.annualDiscountedCents,
        annualSavingsCents: annual.annualSavingsCents,
        annualSavingsPercent: annual.annualSavingsPercent,
      };
    }
    default:
      return {
        primaryCents: resolved.monthlyPriceCents,
        primarySuffix: ' / month',
        originalCents: resolved.originalMonthlyPriceCents,
        showStrikethrough: Boolean(
          resolved.originalMonthlyPriceCents &&
            resolved.originalMonthlyPriceCents > resolved.monthlyPriceCents,
        ),
        discountTag: null,
        secondaryNote: null,
        ...emptySavings,
      };
  }
}

export function getPlanDiscountLabel(plan: PlanPricingFields): string | null {
  return getPlanPriceDisplay(plan).discountTag;
}
