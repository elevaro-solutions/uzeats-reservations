export const PLAN_DURATION_UNITS = ['day', 'week', 'month', 'year'] as const;

export type PlanDurationUnit = (typeof PLAN_DURATION_UNITS)[number];

export type PlanDuration = {
  durationUnit: PlanDurationUnit;
  durationCount: number;
};

const MAX_COUNT: Record<PlanDurationUnit, number> = {
  day: 365,
  week: 52,
  month: 36,
  year: 5,
};

const DAY_MS = 86_400_000;

export function isPlanDurationUnit(value: unknown): value is PlanDurationUnit {
  return typeof value === 'string' && (PLAN_DURATION_UNITS as readonly string[]).includes(value);
}

export function normalizePlanDuration(input?: {
  durationUnit?: string | null;
  durationCount?: number | null;
} | null): PlanDuration {
  const durationUnit = isPlanDurationUnit(input?.durationUnit) ? input.durationUnit : 'month';
  const raw = typeof input?.durationCount === 'number' ? input.durationCount : Number(input?.durationCount);
  const n = Number.isFinite(raw) ? Math.floor(raw) : 1;
  const durationCount = Math.max(1, Math.min(MAX_COUNT[durationUnit], n));
  return { durationUnit, durationCount };
}

export function isStandardMonthlyDuration(
  unit?: string | null,
  count?: number | null,
): boolean {
  const duration = normalizePlanDuration({ durationUnit: unit, durationCount: count });
  return duration.durationUnit === 'month' && duration.durationCount === 1;
}

export function durationCountMax(unit?: string | null): number {
  return isPlanDurationUnit(unit) ? MAX_COUNT[unit] : MAX_COUNT.month;
}

export function formatPlanDuration(unit?: string | null, count?: number | null): string {
  const duration = normalizePlanDuration({ durationUnit: unit, durationCount: count });
  const { durationUnit, durationCount } = duration;
  if (durationUnit === 'day') return durationCount === 1 ? '1 day' : `${durationCount} days`;
  if (durationUnit === 'week') return durationCount === 1 ? '1 week' : `${durationCount} weeks`;
  if (durationUnit === 'year') return durationCount === 1 ? '1 year' : `${durationCount} years`;
  return durationCount === 1 ? '1 month' : `${durationCount} months`;
}

/** Price suffix for cards and pickers, e.g. ` / month`, ` / 3 months`, ` / 14 days`. */
export function formatPlanPriceSuffix(unit?: string | null, count?: number | null): string {
  const duration = normalizePlanDuration({ durationUnit: unit, durationCount: count });
  if (duration.durationUnit === 'month' && duration.durationCount === 1) return ' / month';
  if (duration.durationUnit === 'day' && duration.durationCount === 1) return ' / day';
  if (duration.durationUnit === 'week' && duration.durationCount === 1) return ' / week';
  if (duration.durationUnit === 'year' && duration.durationCount === 1) return ' / year';
  return ` / ${formatPlanDuration(duration.durationUnit, duration.durationCount)}`;
}

export function addPlanDuration(
  from: Date,
  unit?: string | null,
  count?: number | null,
): Date {
  const duration = normalizePlanDuration({ durationUnit: unit, durationCount: count });
  const next = new Date(from.getTime());
  if (duration.durationUnit === 'day') {
    next.setTime(next.getTime() + duration.durationCount * DAY_MS);
    return next;
  }
  if (duration.durationUnit === 'week') {
    next.setTime(next.getTime() + duration.durationCount * 7 * DAY_MS);
    return next;
  }
  if (duration.durationUnit === 'year') {
    next.setFullYear(next.getFullYear() + duration.durationCount);
    return next;
  }
  next.setMonth(next.getMonth() + duration.durationCount);
  return next;
}

/**
 * Stripe recurring interval. Stripe allows at most a 1-year interval
 * (365 days, 52 weeks, 12 months, or 1 year). Longer local packages still bill locally
 * for the full duration; Stripe is clamped.
 */
export function toStripeRecurring(unit?: string | null, count?: number | null): {
  interval: PlanDurationUnit;
  interval_count: number;
} {
  const duration = normalizePlanDuration({ durationUnit: unit, durationCount: count });
  if (duration.durationUnit === 'day') {
    return { interval: 'day', interval_count: Math.min(365, duration.durationCount) };
  }
  if (duration.durationUnit === 'week') {
    return { interval: 'week', interval_count: Math.min(52, duration.durationCount) };
  }
  if (duration.durationUnit === 'year') {
    return { interval: 'year', interval_count: 1 };
  }
  return { interval: 'month', interval_count: Math.min(12, duration.durationCount) };
}

/** Months equivalent for invoice rows that still store `packageDurationMonths`. Days and weeks do not map. */
export function durationToLegacyMonths(unit?: string | null, count?: number | null): number | null {
  const duration = normalizePlanDuration({ durationUnit: unit, durationCount: count });
  if (duration.durationUnit === 'month') return duration.durationCount;
  if (duration.durationUnit === 'year') return duration.durationCount * 12;
  return null;
}

export function resolveInvoiceDuration(input?: {
  packageDurationUnit?: string | null;
  packageDurationCount?: number | null;
  packageDurationMonths?: number | null;
  durationUnit?: string | null;
  durationCount?: number | null;
} | null): PlanDuration | null {
  if (!input) return null;
  if (input.packageDurationUnit || input.durationUnit || input.packageDurationCount || input.durationCount) {
    return normalizePlanDuration({
      durationUnit: input.packageDurationUnit ?? input.durationUnit,
      durationCount: input.packageDurationCount ?? input.durationCount,
    });
  }
  const months = input.packageDurationMonths;
  if (typeof months === 'number' && Number.isFinite(months) && months >= 1) {
    return normalizePlanDuration({ durationUnit: 'month', durationCount: Math.round(months) });
  }
  return null;
}
