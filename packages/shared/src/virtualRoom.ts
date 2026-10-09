import { z } from 'zod';

/** Experimental add-on: monthly price per restaurant while enabled. */
export const VIRTUAL_ROOM_DEFAULT_MONTHLY_PRICE_CENTS = 5000;
/**
 * Unit fee for 3D table selection. Default $2.
 * Multiplied by party size when mode is `per_guest`; charged once when `per_table`.
 * Who pays is controlled by `selectionFeePayer` (see VIRTUAL_ROOM_SELECTION_FEE_PAYERS).
 */
export const VIRTUAL_ROOM_DEFAULT_PER_GUEST_FEE_CENTS = 200;

export const VIRTUAL_ROOM_MAX_PRICE_CENTS = 1_000_000;

/** How the diner ended up with their table. Only `virtual_3d` can incur the selection fee. */
export const TABLE_SELECTION_SOURCES = ['list', 'virtual_3d'] as const;
export type TableSelectionSource = (typeof TABLE_SELECTION_SOURCES)[number];

/** How the 3D table-selection fee is counted. */
export const VIRTUAL_ROOM_SELECTION_FEE_MODES = ['per_guest', 'per_table'] as const;
export type VirtualRoomSelectionFeeMode = (typeof VIRTUAL_ROOM_SELECTION_FEE_MODES)[number];
export const VIRTUAL_ROOM_DEFAULT_SELECTION_FEE_MODE: VirtualRoomSelectionFeeMode = 'per_guest';

/**
 * Who is billed for a 3D table pick:
 * - `restaurant` — platform unit fee on the restaurant invoice at completion
 * - `diner` — resolved unit fee charged to the diner at booking
 * - `combined` — diner pays platform fee + restaurant fee at booking
 * - `diner_share` — diner pays restaurant fee; platform fee invoiced to restaurant (cut)
 */
export const VIRTUAL_ROOM_SELECTION_FEE_PAYERS = [
  'restaurant',
  'diner',
  'combined',
  'diner_share',
] as const;
export type VirtualRoomSelectionFeePayer = (typeof VIRTUAL_ROOM_SELECTION_FEE_PAYERS)[number];
export const VIRTUAL_ROOM_DEFAULT_SELECTION_FEE_PAYER: VirtualRoomSelectionFeePayer = 'restaurant';

/** Which tables incur the fee when guests pick in 3D. */
export const VIRTUAL_ROOM_SELECTION_FEE_APPLY = ['all', 'selected'] as const;
export type VirtualRoomSelectionFeeApplyTo = (typeof VIRTUAL_ROOM_SELECTION_FEE_APPLY)[number];

/** How multiple floor areas are arranged in the overall 3D view. */
export const VIRTUAL_ROOM_AREA_LAYOUT_MODES = ['stack', 'adjacent', 'custom'] as const;
export type VirtualRoomAreaLayoutMode = (typeof VIRTUAL_ROOM_AREA_LAYOUT_MODES)[number];
export const VIRTUAL_ROOM_DEFAULT_AREA_LAYOUT_MODE: VirtualRoomAreaLayoutMode = 'adjacent';

/** Viewer area switcher value for the combined multi-area scene. */
export const VIRTUAL_ROOM_OVERALL_VIEW = '__overall__';

/** Gap between stacked floors or side-by-side wings (meters). */
export const VIRTUAL_ROOM_AREA_GAP_M = 3;

export const VIRTUAL_ROOM_MEDIA_KINDS = ['photo', 'video'] as const;
export type VirtualRoomMediaKind = (typeof VIRTUAL_ROOM_MEDIA_KINDS)[number];

/**
 * - `panorama`: 360° equirectangular photo shown around the room.
 * - `wall`: photo wrapped onto the room walls.
 * - `capture`: walkthrough photo/video sent to photogrammetry.
 */
export const VIRTUAL_ROOM_MEDIA_ROLES = ['panorama', 'wall', 'capture'] as const;
export type VirtualRoomMediaRole = (typeof VIRTUAL_ROOM_MEDIA_ROLES)[number];

export const VIRTUAL_ROOM_MEDIA_ROLE_LABELS: Record<VirtualRoomMediaRole, string> = {
  panorama: '360° panorama',
  wall: 'Wall photo',
  capture: '3D scan capture',
};

export const VIRTUAL_ROOM_RECONSTRUCTION_STATUSES = [
  'idle',
  'queued',
  'processing',
  'ready',
  'failed',
] as const;
export type VirtualRoomReconstructionStatus =
  (typeof VIRTUAL_ROOM_RECONSTRUCTION_STATUSES)[number];

export const VIRTUAL_ROOM_MAX_MEDIA = 160;
/** KIRI Engine needs ≥ 20 photos. We cap below its 300 limit because the worker buffers every photo before upload. */
export const VIRTUAL_ROOM_MIN_CAPTURE_PHOTOS = 20;
export const VIRTUAL_ROOM_MAX_CAPTURE_PHOTOS = 100;
export const VIRTUAL_ROOM_VIDEO_MAX_BYTES = 250 * 1024 * 1024;
export const VIRTUAL_ROOM_VIDEO_CONTENT_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;

/** Ceiling height in meters when an area has no override. */
export const VIRTUAL_ROOM_DEFAULT_WALL_HEIGHT_M = 3;
export const VIRTUAL_ROOM_MIN_WALL_HEIGHT_M = 2;
export const VIRTUAL_ROOM_MAX_WALL_HEIGHT_M = 12;

const FEET_TO_METERS = 0.3048;

/** Meters per floor-plan grid cell for the given scale. */
export function metersPerGridCell(scale: { unit?: string | null; unitsPerCell?: number | null } | null | undefined) {
  const units = Number(scale?.unitsPerCell);
  const unitsPerCell = Number.isFinite(units) && units > 0 ? units : 2;
  return scale?.unit === 'm' ? unitsPerCell : unitsPerCell * FEET_TO_METERS;
}

/** @deprecated Prefer `virtualRoomSelectionFeeCents` with an explicit mode. */
export function virtualRoomGuestFeeCents(perGuestFeeCents: number, partySize: number) {
  return virtualRoomSelectionFeeCents(perGuestFeeCents, partySize, 'per_guest');
}

/** Total 3D table-selection fee for one booking (restaurant invoice or diner prepay). */
export function virtualRoomSelectionFeeCents(
  unitFeeCents: number,
  partySize: number,
  mode: VirtualRoomSelectionFeeMode = 'per_guest',
) {
  const fee = Math.max(0, Math.round(unitFeeCents));
  if (mode === 'per_table') return fee;
  return fee * Math.max(0, Math.floor(partySize));
}

export function resolveVirtualRoomSelectionFeePayer(
  value?: VirtualRoomSelectionFeePayer | string | null,
): VirtualRoomSelectionFeePayer {
  if (
    value === 'diner' ||
    value === 'combined' ||
    value === 'diner_share' ||
    value === 'restaurant'
  ) {
    return value;
  }
  return VIRTUAL_ROOM_DEFAULT_SELECTION_FEE_PAYER;
}

/** True when the diner is charged any selection fee at booking. */
export function virtualRoomSelectionFeeChargedToDiner(
  payer?: VirtualRoomSelectionFeePayer | string | null,
) {
  const resolved = resolveVirtualRoomSelectionFeePayer(payer);
  return resolved === 'diner' || resolved === 'combined' || resolved === 'diner_share';
}

/** True when the restaurant is invoiced a selection fee on completion. */
export function virtualRoomSelectionFeeInvoicedToRestaurant(
  payer?: VirtualRoomSelectionFeePayer | string | null,
) {
  const resolved = resolveVirtualRoomSelectionFeePayer(payer);
  return resolved === 'restaurant' || resolved === 'diner_share';
}

export type VirtualRoomSelectionFeeResolution = {
  unitFeeCents: number;
  mode: VirtualRoomSelectionFeeMode;
  /** Platform unit fee (always from platform config). */
  platformUnitFeeCents: number;
  /**
   * Restaurant/area/table override unit fee, or null when none is set.
   * For `diner` / `restaurant` payers, `unitFeeCents` already folds this in.
   */
  restaurantUnitFeeCents: number | null;
};

/** Guest may pick this table in 3D only when area and table both allow it (default true). */
export function isVirtualRoomTableSelectable(input: {
  area?: { guestSelectable?: boolean | null } | null;
  table?: { virtualRoomSelectable?: boolean | null } | null;
}) {
  if (input.area?.guestSelectable === false) return false;
  if (input.table?.virtualRoomSelectable === false) return false;
  return true;
}

/**
 * Resolve the 3D selection fee for a booking.
 * Platform → restaurant → floor area → table (cents). Opt-out via area/table flags.
 * Returns null when the fee does not apply.
 */
export function resolveVirtualRoomSelectionFee(input: {
  platform: { perGuestFeeCents: number; selectionFeeMode?: VirtualRoomSelectionFeeMode | null };
  restaurant?: {
    virtualRoomSelectionFeeEnabled?: boolean | null;
    virtualRoomSelectionFeeMode?: VirtualRoomSelectionFeeMode | null;
    virtualRoomSelectionFeeCents?: number | null;
    virtualRoomSelectionFeeApplyTo?: VirtualRoomSelectionFeeApplyTo | null;
  } | null;
  area?: {
    selectionFeeCharged?: boolean | null;
    selectionFeeCents?: number | null;
  } | null;
  table?: {
    virtualRoomSelectionFeeEnabled?: boolean | null;
    virtualRoomSelectionFeeCents?: number | null;
  } | null;
}): VirtualRoomSelectionFeeResolution | null {
  const restaurant = input.restaurant ?? {};
  if (restaurant.virtualRoomSelectionFeeEnabled === false) return null;
  if (input.area?.selectionFeeCharged === false) return null;

  const applyTo = restaurant.virtualRoomSelectionFeeApplyTo ?? 'all';
  // `selected` = only tables with virtualRoomSelectionFeeEnabled. `all` = every 3D pick
  // (per-table flag is ignored; use area.selectionFeeCharged / restaurant toggle to opt out).
  if (applyTo === 'selected' && input.table?.virtualRoomSelectionFeeEnabled !== true) return null;

  const mode =
    restaurant.virtualRoomSelectionFeeMode ??
    input.platform.selectionFeeMode ??
    VIRTUAL_ROOM_DEFAULT_SELECTION_FEE_MODE;
  const platformUnitFeeCents = Math.max(0, Math.round(Number(input.platform.perGuestFeeCents) || 0));
  const overrideRaw =
    input.table?.virtualRoomSelectionFeeCents != null
      ? input.table.virtualRoomSelectionFeeCents
      : input.area?.selectionFeeCents != null
        ? input.area.selectionFeeCents
        : restaurant.virtualRoomSelectionFeeCents != null
          ? restaurant.virtualRoomSelectionFeeCents
          : null;
  const restaurantUnitFeeCents =
    overrideRaw != null ? Math.max(0, Math.round(Number(overrideRaw) || 0)) : null;
  // Classic diner/restaurant modes use the override when set (including $0 = no fee).
  const unitFeeCents = restaurantUnitFeeCents ?? platformUnitFeeCents;
  if (platformUnitFeeCents <= 0 && (restaurantUnitFeeCents ?? 0) <= 0) return null;
  return {
    unitFeeCents,
    mode,
    platformUnitFeeCents,
    restaurantUnitFeeCents,
  };
}

/**
 * Total charged to the diner at booking for a 3D pick under the given payer mode.
 * Returns 0 when the diner is not charged.
 */
export function dinerVirtualRoomSelectionFeeTotalCents(input: {
  payer?: VirtualRoomSelectionFeePayer | string | null;
  partySize: number;
  fee: Pick<
    VirtualRoomSelectionFeeResolution,
    'mode' | 'unitFeeCents' | 'platformUnitFeeCents' | 'restaurantUnitFeeCents'
  > | null;
}) {
  if (!input.fee) return 0;
  const payer = resolveVirtualRoomSelectionFeePayer(input.payer);
  const { mode, partySize } = { mode: input.fee.mode, partySize: input.partySize };
  if (payer === 'diner') {
    return virtualRoomSelectionFeeCents(input.fee.unitFeeCents, partySize, mode);
  }
  if (payer === 'combined') {
    const platform = virtualRoomSelectionFeeCents(
      input.fee.platformUnitFeeCents,
      partySize,
      mode,
    );
    const restaurant = virtualRoomSelectionFeeCents(
      input.fee.restaurantUnitFeeCents ?? 0,
      partySize,
      mode,
    );
    return platform + restaurant;
  }
  if (payer === 'diner_share') {
    // Diner pays the restaurant-set price (fallback: platform unit).
    const dinerUnit = input.fee.restaurantUnitFeeCents ?? input.fee.platformUnitFeeCents;
    return virtualRoomSelectionFeeCents(dinerUnit, partySize, mode);
  }
  return 0;
}

export type VirtualRoomAreaPlacement = {
  offsetXM: number;
  offsetYM: number;
  offsetZM: number;
};

export const DEFAULT_VIRTUAL_ROOM_AREA_PLACEMENT: VirtualRoomAreaPlacement = {
  offsetXM: 0,
  offsetYM: 0,
  offsetZM: 0,
};

type AreaPlacementInput = {
  name: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  wallHeightM: number;
};

/**
 * Suggest world-space offsets so multiple floor areas either stack as floors
 * or sit side-by-side (hall / private / entrance). Coordinates are meters.
 */
export function suggestVirtualRoomAreaPlacements(
  areas: AreaPlacementInput[],
  mode: 'stack' | 'adjacent',
  metersPerCell: number,
  gapM = VIRTUAL_ROOM_AREA_GAP_M,
): Array<{ floorArea: string } & VirtualRoomAreaPlacement> {
  const m = Number.isFinite(metersPerCell) && metersPerCell > 0 ? metersPerCell : 0.6;
  const gap = Math.max(0, gapM);
  let cursor = 0;
  return areas.map((area) => {
    const widthM = Math.max(1, (area.bounds.maxX - area.bounds.minX) * m);
    const heightM = Math.max(
      VIRTUAL_ROOM_MIN_WALL_HEIGHT_M,
      area.wallHeightM || VIRTUAL_ROOM_DEFAULT_WALL_HEIGHT_M,
    );
    if (mode === 'stack') {
      const offsetYM = cursor;
      cursor += heightM + gap;
      return { floorArea: area.name, offsetXM: 0, offsetYM, offsetZM: 0 };
    }
    const offsetXM = cursor;
    cursor += widthM + gap;
    return { floorArea: area.name, offsetXM, offsetYM: 0, offsetZM: 0 };
  });
}

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a #RRGGBB color')
  .nullable()
  .optional();

const areaOffset = z.number().min(-500).max(500).optional().nullable();

export const virtualRoomMediaInputSchema = z.object({
  kind: z.enum(VIRTUAL_ROOM_MEDIA_KINDS),
  role: z.enum(VIRTUAL_ROOM_MEDIA_ROLES),
  url: z.string().url().max(1000),
  floorArea: z.string().trim().max(60).optional().nullable(),
  caption: z.string().trim().max(140).optional().nullable(),
});
export type VirtualRoomMediaInput = z.infer<typeof virtualRoomMediaInputSchema>;

export const virtualRoomAreaSettingsInputSchema = z.object({
  floorArea: z.string().trim().min(1).max(60),
  wallHeightM: z
    .number()
    .min(VIRTUAL_ROOM_MIN_WALL_HEIGHT_M)
    .max(VIRTUAL_ROOM_MAX_WALL_HEIGHT_M)
    .optional()
    .nullable(),
  panoramaMediaId: z.string().max(64).optional().nullable(),
  wallColor: hexColor,
  floorColor: hexColor,
  /** World-space meters: sideways (X), vertical stack (Y), depth (Z). */
  offsetXM: areaOffset,
  offsetYM: areaOffset,
  offsetZM: areaOffset,
  /** When false, guests cannot pick tables in this floor area from 3D. Default true. */
  guestSelectable: z.boolean().optional().nullable(),
  /** When false, 3D picks in this area do not add the selection fee. Default true. */
  selectionFeeCharged: z.boolean().optional().nullable(),
  /** Per-area unit fee override in cents; null inherits restaurant/platform. */
  selectionFeeCents: z
    .number()
    .int()
    .min(0)
    .max(VIRTUAL_ROOM_MAX_PRICE_CENTS)
    .optional()
    .nullable(),
});
export type VirtualRoomAreaSettingsInput = z.infer<typeof virtualRoomAreaSettingsInputSchema>;

/** Aligns a photogrammetry model (arbitrary scale/orientation) with the floor plan. */
export const virtualRoomModelTransformSchema = z.object({
  scale: z.number().min(0.05).max(20),
  rotationDeg: z.number().min(-360).max(360),
  offsetXM: z.number().min(-200).max(200),
  offsetZM: z.number().min(-200).max(200),
});
export type VirtualRoomModelTransform = z.infer<typeof virtualRoomModelTransformSchema>;

export const DEFAULT_VIRTUAL_ROOM_MODEL_TRANSFORM: VirtualRoomModelTransform = {
  scale: 1,
  rotationDeg: 0,
  offsetXM: 0,
  offsetZM: 0,
};

export const virtualRoomUpdateInputSchema = z.object({
  areaSettings: z.array(virtualRoomAreaSettingsInputSchema).max(40).optional(),
  areaLayoutMode: z.enum(VIRTUAL_ROOM_AREA_LAYOUT_MODES).optional(),
  useReconstructedModel: z.boolean().optional(),
  modelTransform: virtualRoomModelTransformSchema.optional(),
});
export type VirtualRoomUpdateInput = z.infer<typeof virtualRoomUpdateInputSchema>;

export const virtualRoomPricingInputSchema = z.object({
  monthlyPriceCents: z.number().int().min(0).max(VIRTUAL_ROOM_MAX_PRICE_CENTS).optional(),
  /** Unit fee in cents (per guest or per table, depending on selectionFeeMode). */
  perGuestFeeCents: z.number().int().min(0).max(VIRTUAL_ROOM_MAX_PRICE_CENTS).optional(),
  selectionFeeMode: z.enum(VIRTUAL_ROOM_SELECTION_FEE_MODES).optional(),
  selectionFeePayer: z.enum(VIRTUAL_ROOM_SELECTION_FEE_PAYERS).optional(),
});
