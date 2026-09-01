import type { AvailabilitySlot } from "../types";

export function isSlotStillAvailable(
  slots: AvailabilitySlot[],
  selectedSlot: string | null,
): boolean {
  if (!selectedSlot) return false;
  return slots.some((s) => s.time === selectedSlot && s.available);
}

export function canProceedToDetails(
  selectedSlot: string | null,
  partySize: number,
): boolean {
  return Boolean(selectedSlot) && partySize >= 1 && partySize <= 50;
}

export function filterExperiencesForDate<
  T extends { date: string; endDate?: string | null; status: string },
>(experiences: T[], dateIso: string): T[] {
  return experiences.filter((exp) => {
    if (exp.status !== "active") return false;
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
  },
>(packages: T[], partySize: number): T[] {
  return packages.filter((pkg) => {
    if (!pkg.active) return false;
    if (pkg.minPartySize != null && partySize < pkg.minPartySize) return false;
    if (pkg.maxPartySize != null && partySize > pkg.maxPartySize) return false;
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
