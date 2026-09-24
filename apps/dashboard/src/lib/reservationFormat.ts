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
  return source.charAt(0).toUpperCase() + source.slice(1);
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

export function depositRefundableCents(r: {
  depositAmountCents?: number | null;
  depositRefundedCents?: number | null;
  depositRefundableCents?: number | null;
}) {
  if (r.depositRefundableCents != null) return Math.max(0, r.depositRefundableCents);
  return Math.max(0, (r.depositAmountCents ?? 0) - (r.depositRefundedCents ?? 0));
}
