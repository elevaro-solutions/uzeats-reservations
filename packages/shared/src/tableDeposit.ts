import { CANCELLATION_REFUND_HOURS } from './constants.js';

/**
 * How a restaurant collects its per-guest table deposit.
 * - `card_guarantee`: card saved at booking, nothing charged; the amount is a
 *   no-show / late-cancellation fee (OpenTable / Resy style).
 * - `prepaid`: charged at booking, applied to the bill, refundable before the
 *   cancellation cutoff (Tock / OpenTable deposit style).
 */
export type DepositPolicy = 'card_guarantee' | 'prepaid';

export const DEPOSIT_POLICIES = ['card_guarantee', 'prepaid'] as const;

export const DEFAULT_DEPOSIT_POLICY: DepositPolicy = 'card_guarantee';

export const DEPOSIT_POLICY_LABELS: Record<DepositPolicy, string> = {
  card_guarantee: 'Card guarantee (no-show fee)',
  prepaid: 'Prepaid deposit (charged at booking)',
};

/** Diners who cancel within this many hours of the booking pay the no-show fee / lose prepayment. */
export const LATE_CANCELLATION_HOURS = CANCELLATION_REFUND_HOURS;

/** Hard cap for configurable cancel / no-show windows (30 days). */
export const MAX_CANCELLATION_PERIOD_HOURS = 720;

/**
 * Normalize an optional override. Null/empty/invalid → inherit parent.
 * Positive integers are clamped to {@link MAX_CANCELLATION_PERIOD_HOURS}.
 */
export function normalizeCancellationPeriodHours(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(n, MAX_CANCELLATION_PERIOD_HOURS);
}

/**
 * Resolve the cancel / no-show window from most-specific → least-specific layers.
 * Pass overrides in order: experience, private dining, table, restaurant, platform.
 * Falls back to {@link CANCELLATION_REFUND_HOURS} (24).
 */
export function resolveCancellationPeriodHours(
  layers: Array<number | null | undefined> = [],
): number {
  for (const layer of layers) {
    const hours = normalizeCancellationPeriodHours(layer);
    if (hours != null) return hours;
  }
  return CANCELLATION_REFUND_HOURS;
}

/** Human-readable lead time (“24 hours”, “2 days”, “36 hours”). */
export function formatCancellationPeriodLabel(
  hours: number | null | undefined = CANCELLATION_REFUND_HOURS,
): string {
  const h = resolveCancellationPeriodHours([hours]);
  if (h % 24 === 0) {
    const days = h / 24;
    return days === 1 ? '24 hours' : `${days} days`;
  }
  return `${h} hours`;
}

/** Unpaid card-hold / prepaid bookings occupy a table this long, then they are discarded. */
export const BOOKING_CARD_HOLD_MINUTES = 20;

export function resolveDepositPolicy(value?: string | null): DepositPolicy {
  return value === 'prepaid' ? 'prepaid' : DEFAULT_DEPOSIT_POLICY;
}

export type DepositSettings = {
  depositRequired?: boolean | null;
  /** Per-guest deposit in cents. */
  depositAmountCents?: number | null;
};

function perGuestCents(settings: DepositSettings | null | undefined): number | null {
  if (!settings?.depositRequired) return null;
  const cents = Number(settings.depositAmountCents);
  return Number.isFinite(cents) && cents > 0 ? Math.round(cents) : null;
}

/**
 * Per-guest deposit for a booking. A table with its own deposit enabled
 * overrides the restaurant default; otherwise the restaurant setting applies.
 */
export function resolveDepositPerGuestCents(input: {
  restaurant: DepositSettings;
  table?: DepositSettings | null;
}): number {
  return perGuestCents(input.table) ?? perGuestCents(input.restaurant) ?? 0;
}

export function resolveTableDepositCents(input: {
  restaurant: DepositSettings;
  table?: DepositSettings | null;
  partySize: number;
}): number {
  return resolveDepositPerGuestCents(input) * Math.max(0, input.partySize);
}

export type BookingCharges = {
  policy: DepositPolicy;
  /** Per-guest table deposit × party size, before policy split. */
  tableDepositCents: number;
  /** Charged at booking before discounts: add-ons + table deposit when `prepaid`. */
  prepaidGrossCents: number;
  /** Charged off-session only on no-show / late cancel (`card_guarantee`). */
  noShowFeeCents: number;
};

/**
 * Split a booking into what is charged now and what is only guaranteed.
 * Add-ons (packages, private rooms, experiences) are always prepaid.
 */
export function resolveBookingCharges(input: {
  restaurant: DepositSettings & { depositPolicy?: string | null };
  table?: DepositSettings | null;
  partySize: number;
  addOnsCents?: number;
}): BookingCharges {
  const policy = resolveDepositPolicy(input.restaurant.depositPolicy);
  const tableDepositCents = resolveTableDepositCents(input);
  const addOnsCents = Math.max(0, Math.round(input.addOnsCents ?? 0));
  return {
    policy,
    tableDepositCents,
    prepaidGrossCents: addOnsCents + (policy === 'prepaid' ? tableDepositCents : 0),
    noShowFeeCents: policy === 'card_guarantee' ? tableDepositCents : 0,
  };
}

/** True when cancelling now forfeits prepayment and triggers the no-show fee. */
export function isLateCancellation(
  slotStart: Date | string,
  now: Date = new Date(),
  periodHours: number | null | undefined = LATE_CANCELLATION_HOURS,
): boolean {
  const start = typeof slotStart === 'string' ? new Date(slotStart) : slotStart;
  const hours = resolveCancellationPeriodHours([periodHours]);
  const hoursUntil = (start.getTime() - now.getTime()) / 3_600_000;
  return hoursUntil < hours;
}

/** Diner-facing one-liner for a no-show fee. */
export function noShowFeePolicyText(
  noShowFeeCents: number,
  periodHours: number | null | undefined = LATE_CANCELLATION_HOURS,
): string {
  const amount = `$${(noShowFeeCents / 100).toFixed(2)}`;
  const lead = formatCancellationPeriodLabel(periodHours);
  return `Your card is saved, not charged. A ${amount} fee applies only if you don't show up or cancel less than ${lead} before your reservation.`;
}

/** Diner-facing one-liner for a prepayment. */
export function prepaymentPolicyText(
  periodHours: number | null | undefined = LATE_CANCELLATION_HOURS,
): string {
  const lead = formatCancellationPeriodLabel(periodHours);
  return `Charged now and applied to your bill. Fully refunded if you cancel at least ${lead} ahead.`;
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export type DinerCancelChargeInput = {
  status?: string | null;
  slotStart: Date | string;
  noShowFeeCents?: number | null;
  cardGuaranteeStatus?: string | null;
  depositAmountCents?: number | null;
  depositStatus?: string | null;
  depositRefundedCents?: number | null;
  /** Snapshot from booking; unset legacy rows use the 24h default. */
  cancellationPeriodHours?: number | null;
};

export type DinerCancelChargePreview = {
  late: boolean;
  noShowFeeCents: number;
  prepaidForfeitCents: number;
};

/**
 * What a diner would pay / forfeit if they cancel now.
 * Matches API: only confirmed bookings inside the configured window are charged.
 */
export function dinerCancelChargePreview(
  r: DinerCancelChargeInput,
  now: Date = new Date(),
): DinerCancelChargePreview {
  const late =
    r.status === 'confirmed' &&
    isLateCancellation(r.slotStart, now, r.cancellationPeriodHours);
  const noShowFeeCents =
    late && r.cardGuaranteeStatus === 'card_saved' && (r.noShowFeeCents ?? 0) > 0
      ? Math.round(r.noShowFeeCents ?? 0)
      : 0;
  const remaining = Math.max(
    0,
    Math.round(r.depositAmountCents ?? 0) - Math.round(r.depositRefundedCents ?? 0),
  );
  const prepaidForfeitCents =
    late && remaining > 0 && (r.depositStatus === 'captured' || r.depositStatus === 'authorized')
      ? remaining
      : 0;
  return { late, noShowFeeCents, prepaidForfeitCents };
}

/** Warning shown in the diner cancel dialog, or null when cancelling is free. */
export function dinerCancelChargeWarning(
  r: DinerCancelChargeInput,
  now: Date = new Date(),
): string | null {
  const preview = dinerCancelChargePreview(r, now);
  const lead = formatCancellationPeriodLabel(r.cancellationPeriodHours);
  const parts: string[] = [];
  if (preview.noShowFeeCents > 0) {
    parts.push(
      `Your saved card will be charged a ${usd(preview.noShowFeeCents)} late-cancellation fee because you are cancelling less than ${lead} before your reservation.`,
    );
  }
  if (preview.prepaidForfeitCents > 0) {
    parts.push(
      `Your ${usd(preview.prepaidForfeitCents)} deposit will not be refunded.`,
    );
  }
  return parts.length > 0 ? parts.join(' ') : null;
}
