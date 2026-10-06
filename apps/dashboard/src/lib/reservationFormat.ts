import { DISPLAY_LOCALE, OCCASION_LABELS } from '@reservations/shared';

export function guestName(diner?: {
  firstName?: string | null;
  lastName?: string | null;
} | null) {
  return `${diner?.firstName ?? ''} ${diner?.lastName ?? ''}`.trim() || 'Walk-in / phone';
}

export function guestInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  return letters || 'G';
}

export function formatOccasion(occasion?: string | null) {
  if (!occasion || occasion === 'none') return null;
  return OCCASION_LABELS[occasion as keyof typeof OCCASION_LABELS]
    ?? occasion.charAt(0).toUpperCase() + occasion.slice(1);
}

export function formatSource(source?: string | null) {
  if (!source) return null;
  if (source === 'walkin') return 'Walk-in';
  if (source === 'network') return 'Platform';
  return source.charAt(0).toUpperCase() + source.slice(1);
}

export function formatAttributionUrl(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}` || url;
  } catch {
    return url;
  }
}

export function formatUsd(cents?: number | null) {
  if (!cents) return null;
  return new Intl.NumberFormat(DISPLAY_LOCALE, { style: 'currency', currency: 'USD' }).format(
    cents / 100,
  );
}

const DEPOSIT_STATUS_LABELS: Record<string, string> = {
  none: 'None',
  requires_payment: 'Payment due',
  authorized: 'Held',
  captured: 'Captured',
  refunded: 'Refunded',
  failed: 'Failed',
};

export function formatDepositStatus(
  status?: string | null,
  opts?: { depositAmountCents?: number | null; depositRefundedCents?: number | null },
) {
  if (!status) return null;
  const refunded = opts?.depositRefundedCents ?? 0;
  const total = opts?.depositAmountCents ?? 0;
  if (status === 'captured' && refunded > 0 && refunded < total) {
    return 'Partially refunded';
  }
  return DEPOSIT_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

/** Partner/admin can release a hold or refund remaining captured balance. */
export function canRefundDeposit(r: {
  depositStatus?: string | null;
  depositAmountCents?: number | null;
  depositRefundedCents?: number | null;
  depositRefundableCents?: number | null;
}) {
  const amount = r.depositAmountCents ?? 0;
  if (amount <= 0) return false;
  if (r.depositStatus === 'authorized') return true;
  if (r.depositStatus !== 'captured') return false;
  const remaining =
    r.depositRefundableCents ??
    Math.max(0, amount - (r.depositRefundedCents ?? 0));
  return remaining > 0;
}

export type NoShowFeeFields = {
  status?: string | null;
  noShowFeeCents?: number | null;
  cardGuaranteeStatus?: string | null;
  noShowFeeReason?: string | null;
  noShowFeeError?: string | null;
};

const CARD_GUARANTEE_LABELS: Record<string, string> = {
  requires_card: 'Card not saved',
  card_saved: 'Card on file',
  released: 'Released',
  charged: 'Charged',
  failed: 'Charge failed',
  refunded: 'Refunded',
};

/** e.g. "$50.00 · Charged (late cancel)" — null when the booking has no fee. */
export function formatNoShowFee(r: NoShowFeeFields) {
  const amount = formatUsd(r.noShowFeeCents);
  if (!amount) return null;
  const status = r.cardGuaranteeStatus ?? 'none';
  let label = CARD_GUARANTEE_LABELS[status] ?? null;
  if ((status === 'charged' || status === 'refunded') && r.noShowFeeReason) {
    label = `${label} (${r.noShowFeeReason === 'late_cancel' ? 'late cancel' : 'no-show'})`;
  }
  if (status === 'failed' && r.noShowFeeError) label = `${label}: ${r.noShowFeeError}`;
  return [amount, label].filter(Boolean).join(' · ');
}

/** Staff can (re)try the fee on a no-show while the card is still on file. */
export function canChargeNoShowFee(r: NoShowFeeFields) {
  return (
    r.status === 'no_show' &&
    (r.noShowFeeCents ?? 0) > 0 &&
    (r.cardGuaranteeStatus === 'card_saved' || r.cardGuaranteeStatus === 'failed')
  );
}

export function canRefundNoShowFee(r: NoShowFeeFields) {
  return r.cardGuaranteeStatus === 'charged';
}

export function depositRefundableCents(r: {
  depositAmountCents?: number | null;
  depositRefundedCents?: number | null;
  depositRefundableCents?: number | null;
}) {
  if (r.depositRefundableCents != null) return Math.max(0, r.depositRefundableCents);
  return Math.max(0, (r.depositAmountCents ?? 0) - (r.depositRefundedCents ?? 0));
}
