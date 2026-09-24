const TERMINAL_STATUSES = new Set(['cancelled', 'completed', 'no_show']);
const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'seated']);

export type ReservationListSegment = 'upcoming' | 'past' | 'deposit';

export type ReservationTimingFields = {
  status: string;
  slotStart: string;
  slotEnd?: string | null;
  depositStatus?: string | null;
  depositAmountCents?: number | null;
  requiresManualApproval?: boolean | null;
};

export function isReservationPast(r: ReservationTimingFields): boolean {
  if (TERMINAL_STATUSES.has(r.status)) return true;
  const end = r.slotEnd ? new Date(r.slotEnd) : new Date(r.slotStart);
  return Number.isFinite(end.getTime()) && end.getTime() < Date.now();
}

/** Diner-facing status — elapsed active bookings show as "past", not still confirmed. */
export function displayReservationStatus(r: ReservationTimingFields): string {
  if (TERMINAL_STATUSES.has(r.status)) return r.status;
  if (ACTIVE_STATUSES.has(r.status) && isReservationPast(r)) return 'past';
  if (needsDepositPayment(r)) return 'pending';
  if (
    r.status === 'pending' &&
    r.requiresManualApproval &&
    !needsDepositPayment(r)
  ) {
    return 'awaiting_approval';
  }
  return r.status;
}

export function isReservationUpcoming(r: ReservationTimingFields): boolean {
  return ACTIVE_STATUSES.has(r.status) && !isReservationPast(r);
}

export function needsDepositPayment(r: ReservationTimingFields): boolean {
  return (
    isReservationUpcoming(r) &&
    r.depositStatus === 'requires_payment' &&
    (r.depositAmountCents ?? 0) > 0
  );
}

/** Past visits can be reviewed even if managers never flipped status to completed. */
export function canLeaveReview(r: {
  status: string;
  slotStart: string;
  slotEnd?: string | null;
  hasReview?: boolean | null;
}): boolean {
  if (r.hasReview) return false;
  if (r.status === 'cancelled' || r.status === 'no_show' || r.status === 'pending') {
    return false;
  }
  if (r.status === 'completed') return true;
  if (r.status === 'confirmed' || r.status === 'seated') {
    return isReservationPast(r);
  }
  return false;
}

export function filterReservationsBySegment<T extends ReservationTimingFields>(
  reservations: T[],
  segment: ReservationListSegment,
): T[] {
  switch (segment) {
    case 'upcoming':
      return reservations.filter(isReservationUpcoming);
    case 'past':
      return reservations.filter(isReservationPast);
    case 'deposit':
      return reservations.filter(needsDepositPayment);
    default:
      return reservations;
  }
}

export function defaultReservationSegment(
  reservations: ReservationTimingFields[],
): ReservationListSegment {
  if (reservations.some(needsDepositPayment)) return 'deposit';
  if (reservations.some(isReservationUpcoming)) return 'upcoming';
  return 'past';
}

export function formatReservationDate(slotStart: string): string {
  return new Date(slotStart).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatReservationTime(
  slotStart: string,
  slotEnd?: string | null,
): string {
  const start = new Date(slotStart).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (!slotEnd) return start;
  const end = new Date(slotEnd).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${start} – ${end}`;
}

export function formatReservationWhen(slotStart: string): string {
  return new Date(slotStart).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatVisitAddress(address?: {
  line1?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
} | null): string | null {
  if (!address) return null;
  const line1 = address.line1?.trim() || '';
  const neighborhood = address.neighborhood?.trim() || '';
  const city = address.city?.trim() || '';
  const state = address.state?.trim() || '';
  if (line1 && neighborhood) return `${line1}, ${neighborhood}`;
  if (neighborhood && city) return `${neighborhood}, ${city}`;
  if (line1 && city) return `${line1}, ${city}`;
  if (neighborhood) return neighborhood;
  if (line1) return line1;
  const locality = [city, state].filter(Boolean).join(', ');
  return locality || null;
}

/** Short guest-facing reference from Mongo/ObjectId-style ids. */
export function formatReservationReference(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9]/g, '');
  const slice = cleaned.slice(-8).toUpperCase();
  return slice || id.toUpperCase();
}

export function formatDepositStatusLabel(status: string): string {
  switch (status) {
    case 'requires_payment':
      return 'Payment due';
    case 'authorized':
      return 'Authorized';
    case 'captured':
      return 'Captured';
    case 'refunded':
      return 'Refunded';
    case 'failed':
      return 'Failed';
    case 'none':
      return 'None';
    default:
      return status.replace(/_/g, ' ');
  }
}

export function isPlaceholderTablePhoto(photoUrl?: string | null): boolean {
  if (!photoUrl) return true;
  return photoUrl.includes('1551782450-a2132b4ba21d');
}

export type PrimaryReservationCta = 'pay_deposit' | 'leave_review' | 'book_again' | null;

export function resolvePrimaryReservationCta(r: {
  status: string;
  slotStart: string;
  slotEnd?: string | null;
  depositStatus?: string | null;
  depositAmountCents?: number | null;
  hasReview?: boolean | null;
}): PrimaryReservationCta {
  if (needsDepositPayment(r)) return 'pay_deposit';
  if (canLeaveReview(r)) return 'leave_review';
  if (isReservationPast(r)) return 'book_again';
  return null;
}
