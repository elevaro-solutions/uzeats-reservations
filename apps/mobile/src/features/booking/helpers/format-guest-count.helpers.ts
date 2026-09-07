export function formatGuestCount(count: number): string {
  return `${count} guest${count === 1 ? "" : "s"}`;
}
