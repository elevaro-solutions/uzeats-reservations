/** Party-size operators for restaurant-level manual approval rules. */
export type ManualApprovalPartySizeOp = 'gt' | 'gte';

export const MANUAL_APPROVAL_PARTY_SIZE_OPS = ['gt', 'gte'] as const;

export type ManualApprovalSettings = {
  enabled?: boolean | null;
  /** `gt` = party size > n; `gte` = party size ≥ n. Defaults to `gte`. */
  partySizeOp?: ManualApprovalPartySizeOp | null;
  /** When enabled and unset/null, every online booking needs approval. */
  partySize?: number | null;
};

/**
 * Whether restaurant-level manual approval applies for this party size.
 * Disabled by default. When enabled with no threshold, all parties match.
 */
export function matchesManualApprovalPartySize(
  partySize: number,
  settings: ManualApprovalSettings,
): boolean {
  if (!settings.enabled) return false;
  const threshold = settings.partySize;
  if (threshold == null || !Number.isFinite(threshold) || threshold < 1) {
    return true;
  }
  const op = settings.partySizeOp === 'gt' ? 'gt' : 'gte';
  return op === 'gt' ? partySize > threshold : partySize >= threshold;
}

/**
 * Booking needs restaurant confirmation when any selected resource opts in,
 * or when restaurant-level party-size rules match.
 */
export function bookingRequiresManualApproval(input: {
  restaurant: ManualApprovalSettings;
  partySize: number;
  resourceRequiresApproval?:
    | boolean
    | null
    | Array<boolean | null | undefined>;
}): boolean {
  const flags = Array.isArray(input.resourceRequiresApproval)
    ? input.resourceRequiresApproval
    : [input.resourceRequiresApproval];
  if (flags.some(Boolean)) return true;
  return matchesManualApprovalPartySize(input.partySize, input.restaurant);
}
