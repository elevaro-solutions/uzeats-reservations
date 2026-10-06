type TableCapacity = {
  maxCapacity: number;
  active: boolean;
};

type PrivateSpaceCapacity = {
  maxGuests: number;
  active: boolean;
};

/** Largest online-bookable party size from active tables / private rooms, or null if none. */
export function getMaxBookablePartySize(
  tables: TableCapacity[] | null | undefined,
  privateSpaces?: PrivateSpaceCapacity[] | null,
): number | null {
  let max: number | null = null;
  for (const table of tables ?? []) {
    if (!table.active) continue;
    if (max == null || table.maxCapacity > max) {
      max = table.maxCapacity;
    }
  }
  for (const space of privateSpaces ?? []) {
    if (!space.active) continue;
    if (max == null || space.maxGuests > max) {
      max = space.maxGuests;
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

/**
 * When party size exceeds floor tables but fits a private room, use that room
 * for availability (smallest fitting room).
 */
export function inferPrivateDiningSpaceIdForParty<
  T extends { id: string; minGuests: number; maxGuests: number; active: boolean },
>(
  partySize: number,
  tables: TableCapacity[] | null | undefined,
  spaces: T[] | null | undefined,
  selectedPrivateSpaceId?: string | null,
): string | null {
  if (selectedPrivateSpaceId) return selectedPrivateSpaceId;
  const maxTable = getMaxBookablePartySize(tables);
  if (maxTable != null && partySize <= maxTable) return null;
  const fitting = (spaces ?? [])
    .filter(
      (s) => s.active && partySize >= s.minGuests && partySize <= s.maxGuests,
    )
    .sort((a, b) => a.maxGuests - b.maxGuests || a.minGuests - b.minGuests);
  return fitting[0]?.id ?? null;
}
