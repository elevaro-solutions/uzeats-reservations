import { MAX_BOOKABLE_PARTY_SIZE } from "@/lib/party-size";

import type { AvailabilitySlot } from "../types";

export { MAX_BOOKABLE_PARTY_SIZE };

/** Compare slot ISO times by instant (avoids `…000Z` vs `…Z` string mismatch). */
export function slotTimesEqual(a: string, b: string): boolean {
  const aMs = new Date(a).getTime();
  const bMs = new Date(b).getTime();
  if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) return a === b;
  return aMs === bMs;
}

export function findSlotByTime(
  slots: AvailabilitySlot[],
  selectedSlot: string | null,
): AvailabilitySlot | undefined {
  if (!selectedSlot) return undefined;
  return slots.find((s) => slotTimesEqual(s.time, selectedSlot));
}

export function isSlotStillAvailable(
  slots: AvailabilitySlot[],
  selectedSlot: string | null,
): boolean {
  const match = findSlotByTime(slots, selectedSlot);
  return Boolean(match?.available);
}

export function canProceedToDetails(
  selectedSlot: string | null,
  partySize: number,
): boolean {
  return (
    Boolean(selectedSlot) &&
    partySize >= 1 &&
    partySize <= MAX_BOOKABLE_PARTY_SIZE
  );
}

export function filterExperiencesForDate<
  T extends { date: string; endDate?: string | null; status: string },
>(experiences: T[], dateIso: string): T[] {
  return experiences.filter((exp) => {
    // API ExperienceStatus: draft | published | sold_out | completed | cancelled
    if (exp.status !== "published") return false;
    const start = exp.date.slice(0, 10);
    const end = (exp.endDate ?? exp.date).slice(0, 10);
    return dateIso >= start && dateIso <= end;
  });
}

export function filterPackagesForParty<
  T extends {
    minPartySize?: number | null;
    maxPartySize?: number | null;
    active: boolean;
    occasions?: string[] | null;
  },
>(packages: T[], partySize: number, occasion = "none"): T[] {
  return packages.filter((pkg) => {
    if (!pkg.active) return false;
    if (pkg.minPartySize != null && partySize < pkg.minPartySize) return false;
    if (pkg.maxPartySize != null && partySize > pkg.maxPartySize) return false;
    if (pkg.occasions?.length) {
      if (occasion === "none") return false;
      if (!pkg.occasions.includes(occasion)) return false;
    }
    return true;
  });
}

export function filterPrivateSpacesForParty<
  T extends { minGuests: number; maxGuests: number; active: boolean },
>(spaces: T[], partySize: number): T[] {
  return spaces.filter(
    (space) =>
      space.active &&
      partySize >= space.minGuests &&
      partySize <= space.maxGuests,
  );
}
