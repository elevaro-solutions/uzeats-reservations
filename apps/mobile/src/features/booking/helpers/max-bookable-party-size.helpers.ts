type TableCapacity = {
  maxCapacity: number;
  active: boolean;
};

/** Largest online-bookable party size from active tables, or null if none. */
export function getMaxBookablePartySize(
  tables: TableCapacity[] | null | undefined,
): number | null {
  let max: number | null = null;
  for (const table of tables ?? []) {
    if (!table.active) continue;
    if (max == null || table.maxCapacity > max) {
      max = table.maxCapacity;
    }
  }
  return max;
}

export function isPartyTooLarge(
  partySize: number,
  maxBookablePartySize: number | null,
): boolean {
  return maxBookablePartySize != null && partySize > maxBookablePartySize;
}
