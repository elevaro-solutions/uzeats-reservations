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

/**
 * `required` = booking will definitely wait for restaurant confirmation;
 * `possible` = diner can still pick a table that needs approval;
 * `none` = auto-confirm path (or selected table/resources do not need approval).
 */
export type BookingApprovalPreview = 'required' | 'possible' | 'none';

/**
 * Pre-booking guess of `bookingRequiresManualApproval` for diner UIs.
 *
 * Auto-assign prefers tables that do not require approval, so mixed candidates
 * are `none` unless the diner can choose tables (`allowGuestTableSelection`),
 * in which case mixed candidates are `possible`.
 */
export function previewBookingManualApproval(input: {
  restaurant: ManualApprovalSettings;
  partySize: number;
  resourceRequiresApproval?: Array<boolean | null | undefined>;
  selectedTableRequiresApproval?: boolean | null;
  candidateTableFlags?: Array<boolean | null | undefined> | null;
  /** When true, mixed candidate tables can still become `possible`. */
  allowGuestTableSelection?: boolean | null;
}): BookingApprovalPreview {
  if (
    bookingRequiresManualApproval({
      restaurant: input.restaurant,
      partySize: input.partySize,
      resourceRequiresApproval: [
        ...(input.resourceRequiresApproval ?? []),
        input.selectedTableRequiresApproval,
      ],
    })
  ) {
    return 'required';
  }
  if (input.selectedTableRequiresApproval != null) return 'none';
  const candidates = input.candidateTableFlags ?? [];
  if (candidates.length === 0) return 'none';
  const anyNeedsApproval = candidates.some(Boolean);
  const anyAutoConfirm = candidates.some((flag) => !flag);
  if (!anyNeedsApproval) return 'none';
  if (!anyAutoConfirm) return 'required';
  // Mixed candidates: auto-assign prefers auto-confirm tables.
  return input.allowGuestTableSelection ? 'possible' : 'none';
}
