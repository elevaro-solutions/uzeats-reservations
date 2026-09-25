/** Compare slot ISO times by instant (avoids `…000Z` vs `…Z` string mismatch). */
export function slotTimesEqual(a: string, b: string): boolean {
  const aMs = new Date(a).getTime();
  const bMs = new Date(b).getTime();
  if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) return a === b;
  return aMs === bMs;
}

export function findSlotByTime<T extends { time: string }>(
  slots: T[],
  selectedSlot: string | null,
): T | undefined {
  if (!selectedSlot) return undefined;
  return slots.find((s) => slotTimesEqual(s.time, selectedSlot));
}

export function isSlotStillAvailable(
  slots: Array<{ time: string; available: boolean }>,
  selectedSlot: string | null,
): boolean {
  const match = findSlotByTime(slots, selectedSlot);
  return Boolean(match?.available);
}
