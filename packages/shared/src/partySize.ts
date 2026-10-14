/**
 * Online party-size bounds for diner pickers and booking validation.
 * Restaurant settings may override; unset fields use these defaults.
 */

/**
 * Soft ceiling for restaurant-configured online min/max party size.
 * High enough for banquet / buyout listings; not a product “50 guests” cap.
 */
export const MAX_PARTY_SIZE_SETTING = 999;

/** Discovery / cross-restaurant Guests picker upper bound (not restaurant settings). */
export const MAX_BOOKABLE_PARTY_SIZE = 50;

/** @deprecated Use MAX_PARTY_SIZE_SETTING for restaurant settings. Kept as alias. */
export const MAX_ACCEPTED_PARTY_SIZE = MAX_PARTY_SIZE_SETTING;

/** Default minimum guests when a restaurant has not set accepted party sizes. */
export const DEFAULT_MIN_PARTY_SIZE = 1;

/** Default maximum guests when a restaurant has not set accepted party sizes. */
export const DEFAULT_MAX_PARTY_SIZE = 20;

/** Sentinel Select value for the "Large party" CTA (not a bookable size). */
export const LARGE_PARTY_SELECT_VALUE = 'large_party' as const;

export type AcceptedPartySizeSettings = {
  minPartySize?: number | null;
  maxPartySize?: number | null;
};

export type ResolvedAcceptedPartySize = {
  min: number;
  max: number;
};

function clampPartyBound(value: number, fallback: number, ceiling: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value)) return fallback;
  return Math.min(ceiling, Math.max(1, value));
}

/**
 * Resolve restaurant accepted online party sizes.
 * Null/unset → defaults (1–20). Always returns min ≤ max within 1–MAX_PARTY_SIZE_SETTING.
 */
export function resolveAcceptedPartySize(
  settings: AcceptedPartySizeSettings | null | undefined,
): ResolvedAcceptedPartySize {
  const min = clampPartyBound(
    settings?.minPartySize ?? DEFAULT_MIN_PARTY_SIZE,
    DEFAULT_MIN_PARTY_SIZE,
    MAX_PARTY_SIZE_SETTING,
  );
  const maxRaw = clampPartyBound(
    settings?.maxPartySize ?? DEFAULT_MAX_PARTY_SIZE,
    DEFAULT_MAX_PARTY_SIZE,
    MAX_PARTY_SIZE_SETTING,
  );
  const max = Math.max(min, maxRaw);
  return { min, max };
}

/** Whether `partySize` is within the restaurant's accepted online range. */
export function isAcceptedPartySize(
  partySize: number,
  settings: AcceptedPartySizeSettings | null | undefined,
): boolean {
  if (!Number.isInteger(partySize) || partySize < 1) return false;
  const { min, max } = resolveAcceptedPartySize(settings);
  return partySize >= min && partySize <= max;
}

/** Clamp a party size into the accepted range (for URL/draft restore). */
export function clampToAcceptedPartySize(
  partySize: number,
  settings: AcceptedPartySizeSettings | null | undefined,
): number {
  const { min, max } = resolveAcceptedPartySize(settings);
  if (!Number.isFinite(partySize)) return Math.min(Math.max(2, min), max);
  return Math.min(max, Math.max(min, Math.round(partySize)));
}

export type PartySizeSelectOption = {
  value: number | typeof LARGE_PARTY_SELECT_VALUE;
  label: string;
};

/**
 * Options for a diner Guests select: accepted sizes, plus a Large party CTA
 * when the restaurant max is below the settings ceiling (room to inquire larger).
 */
export function partySizeSelectOptions(
  settings: AcceptedPartySizeSettings | null | undefined,
  opts?: { includeLargeParty?: boolean },
): PartySizeSelectOption[] {
  const { min, max } = resolveAcceptedPartySize(settings);
  const includeLargeParty = opts?.includeLargeParty !== false && max < MAX_PARTY_SIZE_SETTING;
  const options: PartySizeSelectOption[] = [];
  for (let n = min; n <= max; n += 1) {
    options.push({
      value: n,
      label: n === 1 ? '1 guest' : `${n} guests`,
    });
  }
  if (includeLargeParty) {
    options.push({
      value: LARGE_PARTY_SELECT_VALUE,
      label: `Large party (${max + 1}+)`,
    });
  }
  return options;
}

/** Cross-restaurant discovery picker: 1…MAX_BOOKABLE (no Large party row). */
export function discoveryPartySizeSelectOptions(): PartySizeSelectOption[] {
  const options: PartySizeSelectOption[] = [];
  for (let n = 1; n <= MAX_BOOKABLE_PARTY_SIZE; n += 1) {
    options.push({
      value: n,
      label: n === 1 ? '1 guest' : `${n} guests`,
    });
  }
  return options;
}
