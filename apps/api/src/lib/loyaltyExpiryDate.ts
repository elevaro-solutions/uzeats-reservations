export function computePointsExpiryDate(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + Math.max(0, months));
  return d;
}
