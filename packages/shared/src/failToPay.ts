/** Fail-to-pay ladder for restaurant platform invoices (OpenTable/Resy-style). */

export const FAIL_TO_PAY_STAGES = [
  'current',
  'grace',
  'overdue',
  'unlisted',
  'restricted',
  'terminated',
] as const;

export type FailToPayStage = (typeof FAIL_TO_PAY_STAGES)[number];

export const INVOICE_LINE_KINDS = ['finance_charge', 'declined_fee'] as const;
export type InvoiceLineKind = (typeof INVOICE_LINE_KINDS)[number];

export const FAIL_TO_PAY_DEFAULTS = {
  /** Inclusive last calendar day of grace after due (days 0–7). */
  graceDays: 7,
  unlistDays: 14,
  restrictDays: 30,
  terminateDays: 60,
  /** 1.5% per month. */
  financeChargeBps: 150,
  declinedFeeCents: 2500,
} as const;

export type FailToPayThresholds = {
  graceDays: number;
  unlistDays: number;
  restrictDays: number;
  terminateDays: number;
  financeChargeBps: number;
  declinedFeeCents: number;
};

/** UTC calendar days after due date. Negative = not yet due. Due date itself is day 0. */
export function utcCalendarDaysBetween(from: Date, to: Date): number {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.floor((end - start) / 86_400_000);
}

export function failToPayStageFromDaysPastDue(
  daysPastDue: number | null,
  thresholds: Pick<
    FailToPayThresholds,
    'graceDays' | 'unlistDays' | 'restrictDays' | 'terminateDays'
  > = FAIL_TO_PAY_DEFAULTS,
): FailToPayStage {
  if (daysPastDue == null || daysPastDue < 0) return 'current';
  if (daysPastDue <= thresholds.graceDays) return 'grace';
  if (daysPastDue < thresholds.unlistDays) return 'overdue';
  if (daysPastDue < thresholds.restrictDays) return 'unlisted';
  if (daysPastDue < thresholds.terminateDays) return 'restricted';
  return 'terminated';
}

export function isFailToPayPubliclyListed(stage: FailToPayStage): boolean {
  return stage === 'current' || stage === 'grace' || stage === 'overdue';
}

/** New phone/walk-in covers. Blocked once Restricted. */
export function partnerMayCreateNewCover(stage: FailToPayStage): boolean {
  return (
    stage === 'current' ||
    stage === 'grace' ||
    stage === 'overdue' ||
    stage === 'unlisted'
  );
}

/** Seat / complete / no-show existing bookings (and waitlist already in queue). */
export function partnerMayHonorExisting(stage: FailToPayStage): boolean {
  return stage !== 'terminated';
}

export const FAIL_TO_PAY_RESTRICTED_PATH_PREFIXES = [
  '/billing',
  '/reservations',
  '/waitlist',
  '/floor-ops',
  '/notifications',
  '/support',
  '/release-notes',
] as const;

export const FAIL_TO_PAY_TERMINATED_PATH_PREFIXES = [
  '/billing',
  '/notifications',
  '/support',
  '/release-notes',
] as const;

export function failToPayAllowedPathPrefixes(
  stage: FailToPayStage,
): readonly string[] | null {
  if (stage === 'restricted') return FAIL_TO_PAY_RESTRICTED_PATH_PREFIXES;
  if (stage === 'terminated') return FAIL_TO_PAY_TERMINATED_PATH_PREFIXES;
  return null;
}

export function isFailToPayAllowedPartnerPath(
  pathname: string,
  stage: FailToPayStage,
): boolean {
  const prefixes = failToPayAllowedPathPrefixes(stage);
  if (!prefixes) return true;
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function financeChargeCentsForTotal(
  unpaidTotalCents: number,
  financeChargeBps: number = FAIL_TO_PAY_DEFAULTS.financeChargeBps,
): number {
  if (unpaidTotalCents <= 0 || financeChargeBps <= 0) return 0;
  return Math.round((unpaidTotalCents * financeChargeBps) / 10_000);
}

/** How many 1.5% assessments are due by this calendar day (day 8 = first). */
export function financeChargeAssessmentsDue(
  daysPastDue: number,
  graceDays: number = FAIL_TO_PAY_DEFAULTS.graceDays,
): number {
  if (daysPastDue <= graceDays) return 0;
  return 1 + Math.floor((daysPastDue - graceDays - 1) / 30);
}

export const FAIL_TO_PAY_NOTICE_DAYS = [
  1, 3, 7, 8, 13, 14, 21, 29, 30, 45, 59, 60,
] as const;

export type FailToPayNoticeKey = `day_${(typeof FAIL_TO_PAY_NOTICE_DAYS)[number]}`;

export function failToPayNoticeKeyForDay(daysPastDue: number): FailToPayNoticeKey | null {
  if (!(FAIL_TO_PAY_NOTICE_DAYS as readonly number[]).includes(daysPastDue)) {
    return null;
  }
  return `day_${daysPastDue as (typeof FAIL_TO_PAY_NOTICE_DAYS)[number]}`;
}

export function isEnforcementFeeLineKind(
  kind: string | null | undefined,
): kind is InvoiceLineKind {
  return kind === 'finance_charge' || kind === 'declined_fee';
}

export function invoiceStatusFromDaysPastDue(
  daysPastDue: number,
): 'upcoming' | 'pending' | 'overdue' {
  if (daysPastDue < 0) return 'upcoming';
  if (daysPastDue <= FAIL_TO_PAY_DEFAULTS.graceDays) return 'pending';
  return 'overdue';
}
