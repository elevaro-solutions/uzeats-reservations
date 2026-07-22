import { LOYALTY } from '@reservations/shared';

export function computePointsExpiryDate(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + LOYALTY.POINTS_EXPIRY_MONTHS);
  return d;
}
