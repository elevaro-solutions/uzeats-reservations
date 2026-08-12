const TERMINAL_STATUSES = new Set(['cancelled', 'completed', 'no_show']);
const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'seated']);

export type ReservationListSegment = 'upcoming' | 'past' | 'deposit';

export type ReservationTimingFields = {
  status: string;
  slotStart: string;
  slotEnd?: string | null;
  depositStatus?: string | null;
  depositAmountCents?: number | null;
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

export function canLeaveReview(r: {
  status: string;
  hasReview?: boolean | null;
}): boolean {
  return r.status === 'completed' && !r.hasReview;
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
