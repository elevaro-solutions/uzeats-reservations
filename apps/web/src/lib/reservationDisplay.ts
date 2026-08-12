const TERMINAL_STATUSES = new Set(['cancelled', 'completed', 'no_show']);
const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'seated']);

export function isReservationPast(r: {
  status: string;
  slotStart: string;
  slotEnd?: string | null;
}): boolean {
  if (TERMINAL_STATUSES.has(r.status)) return true;
  const end = r.slotEnd ? new Date(r.slotEnd) : new Date(r.slotStart);
  return Number.isFinite(end.getTime()) && end.getTime() < Date.now();
}

/** Diner-facing status — elapsed active bookings show as "past", not still confirmed. */
export function displayReservationStatus(r: {
  status: string;
  slotStart: string;
  slotEnd?: string | null;
}): string {
  if (TERMINAL_STATUSES.has(r.status)) return r.status;
  if (ACTIVE_STATUSES.has(r.status) && isReservationPast(r)) return 'past';
  return r.status;
}

export function isReservationUpcoming(r: {
  status: string;
  slotStart: string;
  slotEnd?: string | null;
}): boolean {
  return ACTIVE_STATUSES.has(r.status) && !isReservationPast(r);
}
