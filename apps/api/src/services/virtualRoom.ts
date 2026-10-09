import crypto from 'crypto';
import {
  DEFAULT_VIRTUAL_ROOM_AREA_PLACEMENT,
  DEFAULT_VIRTUAL_ROOM_MODEL_TRANSFORM,
  VIRTUAL_ROOM_DEFAULT_AREA_LAYOUT_MODE,
  VIRTUAL_ROOM_DEFAULT_SELECTION_FEE_MODE,
  VIRTUAL_ROOM_DEFAULT_WALL_HEIGHT_M,
  VIRTUAL_ROOM_MAX_MEDIA,
  metersPerGridCell,
  resolveFloorAreaAppearance,
  resolveVirtualRoomSelectionFeePayer,
  suggestVirtualRoomAreaPlacements,
  virtualRoomMediaInputSchema,
  virtualRoomSelectionFeeCents,
  virtualRoomSelectionFeeInvoicedToRestaurant,
  virtualRoomUpdateInputSchema,
  type FloorPlanAreaAppearance,
  type VirtualRoomAreaLayoutMode,
  type VirtualRoomSelectionFeeMode,
  type VirtualRoomSelectionFeePayer,
} from '@reservations/shared';
import { AddonFee } from '../models/AddonFee.js';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { Table } from '../models/Table.js';
import { VirtualRoom, type VirtualRoomDocument } from '../models/VirtualRoom.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { getVirtualRoomPricing, isFeatureEnabled } from './platformConfig.js';
import { getFeatures } from './plans.js';
import { isOwnUploadUrl } from './spaces.js';
import { isReconstructionProviderConfigured } from './virtualRoomReconstruction.js';

const ADDON = 'virtualRoom3d' as const;
const INACTIVE_SUBSCRIPTION_STATUSES = new Set(['cancelled', 'paused']);

function utcPeriod(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

type BilledMonth = { period: string; priceCents: number };

type AddonState = {
  enabled: boolean;
  enabledAt: Date | null;
  disabledAt: Date | null;
  billedMonths: BilledMonth[];
};

function readAddon(sub: unknown): AddonState {
  const raw = (sub as { addons?: { virtualRoom3d?: Partial<AddonState> } } | null)?.addons
    ?.virtualRoom3d;
  return {
    enabled: Boolean(raw?.enabled),
    enabledAt: raw?.enabledAt ?? null,
    disabledAt: raw?.disabledAt ?? null,
    billedMonths: Array.isArray(raw?.billedMonths)
      ? raw.billedMonths.map((m) => ({ period: m.period, priceCents: m.priceCents }))
      : [],
  };
}

// ---------------------------------------------------------------------------
// Add-on status + toggle
// ---------------------------------------------------------------------------

export async function getVirtualRoomAddonStatus(restaurantId: string) {
  const [platformEnabled, pricing, sub] = await Promise.all([
    isFeatureEnabled('virtualRoom3d'),
    getVirtualRoomPricing(),
    Subscription.findOne({ restaurantId }),
  ]);
  const addon = readAddon(sub);

  let ineligibleReason: string | null = null;
  if (!platformEnabled) {
    ineligibleReason = 'Virtual 3D rooms are not available on Tablevera right now.';
  } else if (!sub || INACTIVE_SUBSCRIPTION_STATUSES.has(sub.status)) {
    ineligibleReason = 'An active subscription is required.';
  } else {
    const features = await getFeatures(restaurantId);
    if (!features.floorPlans) {
      ineligibleReason = 'Requires a plan that includes floor plans (Core or Pro).';
    }
  }

  return {
    restaurantId,
    platformEnabled,
    enabled: addon.enabled,
    eligible: ineligibleReason == null,
    active: addon.enabled && ineligibleReason == null,
    ineligibleReason,
    enabledAt: addon.enabledAt,
    monthlyPriceCents: pricing.monthlyPriceCents,
    perGuestFeeCents: pricing.perGuestFeeCents,
    selectionFeeMode: pricing.selectionFeeMode,
    selectionFeePayer: pricing.selectionFeePayer,
  };
}

export async function isVirtualRoomAddonActive(restaurantId: string) {
  return (await getVirtualRoomAddonStatus(restaurantId)).active;
}

export async function setVirtualRoomAddon(restaurantId: string, enabled: boolean, now = new Date()) {
  const sub = await Subscription.findOne({ restaurantId });
  if (!sub) throw new ValidationError('No subscription found');

  const addon = readAddon(sub);
  if (enabled && !addon.enabled) {
    const status = await getVirtualRoomAddonStatus(restaurantId);
    if (!status.eligible) throw new ValidationError(status.ineligibleReason ?? 'Not available');
    const period = utcPeriod(now);
    if (!addon.billedMonths.some((m) => m.period === period)) {
      addon.billedMonths.push({ period, priceCents: status.monthlyPriceCents });
    }
    addon.enabled = true;
    addon.enabledAt = now;
    addon.disabledAt = null;
  } else if (!enabled && addon.enabled) {
    addon.enabled = false;
    addon.disabledAt = now;
  }

  sub.set('addons.virtualRoom3d', addon);
  await sub.save();
  return getVirtualRoomAddonStatus(restaurantId);
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

/** Lock in the current month's price for every subscription that has the add-on on. */
export async function syncVirtualRoomBilledMonths(now = new Date()) {
  if (!(await isFeatureEnabled('virtualRoom3d'))) return 0;
  const period = utcPeriod(now);
  const { monthlyPriceCents } = await getVirtualRoomPricing();
  const due = await Subscription.find({
    'addons.virtualRoom3d.enabled': true,
    status: { $nin: [...INACTIVE_SUBSCRIPTION_STATUSES] },
    'addons.virtualRoom3d.billedMonths.period': { $ne: period },
  }).select('_id restaurantId');
  let billed = 0;
  for (const sub of due) {
    const features = await getFeatures(String(sub.restaurantId));
    if (!features.floorPlans) continue;
    const res = await Subscription.updateOne(
      { _id: sub._id, 'addons.virtualRoom3d.billedMonths.period': { $ne: period } },
      { $push: { 'addons.virtualRoom3d.billedMonths': { period, priceCents: monthlyPriceCents } } },
    );
    billed += res.modifiedCount;
  }
  return billed;
}

type InvoiceLine = {
  description: string;
  quantity: number;
  unitAmountCents: number;
  amountCents: number;
};

export async function buildVirtualRoomInvoiceLines(
  sub: { restaurantId: unknown },
  period: string,
): Promise<InvoiceLine[]> {
  const lines: InvoiceLine[] = [];
  const month = readAddon(sub).billedMonths.find((m) => m.period === period);
  if (month) {
    lines.push({
      description: `Virtual 3D room add-on (experimental) - ${period}`,
      quantity: 1,
      unitAmountCents: month.priceCents,
      amountCents: month.priceCents,
    });
  }

  const fees = await AddonFee.find({
    restaurantId: sub.restaurantId,
    billingPeriod: period,
    addon: ADDON,
    status: { $in: ['pending', 'charged'] },
  });
  const totalCents = fees.reduce((sum, fee) => sum + fee.feeCents, 0);
  if (totalCents > 0) {
    const guests = fees.reduce((sum, fee) => sum + fee.partySize, 0);
    const picks = fees.length;
    // Prefer guest wording when every fee equals unit × party (legacy / per_guest).
    const allPerGuest = fees.every(
      (fee) => fee.unitFeeCents > 0 && fee.feeCents === fee.unitFeeCents * fee.partySize,
    );
    if (allPerGuest) {
      lines.push({
        description: `3D table selection (${guests === 1 ? '1 guest' : `${guests} guests`})`,
        quantity: guests,
        unitAmountCents: guests > 0 ? Math.round(totalCents / guests) : totalCents,
        amountCents: totalCents,
      });
    } else {
      lines.push({
        description: `3D table selection (${picks === 1 ? '1 table pick' : `${picks} table picks`})`,
        quantity: picks,
        unitAmountCents: picks > 0 ? Math.round(totalCents / picks) : totalCents,
        amountCents: totalCents,
      });
    }
  }
  return lines;
}

export async function markVirtualRoomFeesCharged(restaurantId: unknown, period: string) {
  await AddonFee.updateMany(
    { restaurantId, billingPeriod: period, addon: ADDON, status: 'pending', feeCents: { $gt: 0 } },
    { $set: { status: 'charged' } },
  );
}

/**
 * Called when a reservation completes. Idempotent per reservation.
 * Skips when the diner already paid the platform fee (`diner` / `combined`).
 * `diner_share` still invoices the platform cut to the restaurant.
 */
export async function recordVirtualRoomGuestFee(
  reservation: {
    _id: unknown;
    restaurantId: unknown;
    partySize: number;
    tableSelectionSource?: string | null;
    virtualRoomGuestFeeCents?: number | null;
    virtualRoomRestaurantFeeCents?: number | null;
    virtualRoomSelectionFeeMode?: VirtualRoomSelectionFeeMode | null;
    virtualRoomSelectionFeePayer?: VirtualRoomSelectionFeePayer | string | null;
  },
  now = new Date(),
) {
  if (reservation.tableSelectionSource !== 'virtual_3d') return;
  const payer = resolveVirtualRoomSelectionFeePayer(reservation.virtualRoomSelectionFeePayer);
  if (!virtualRoomSelectionFeeInvoicedToRestaurant(payer)) {
    return;
  }
  // diner_share without a restaurant-set price degenerates to diner-paid platform fee — no cut.
  if (
    payer === 'diner_share' &&
    Math.max(0, Math.round(reservation.virtualRoomRestaurantFeeCents ?? 0)) <= 0
  ) {
    return;
  }
  const unitFeeCents = Math.max(0, Math.round(reservation.virtualRoomGuestFeeCents ?? 0));
  if (unitFeeCents <= 0) return;
  const mode = reservation.virtualRoomSelectionFeeMode ?? VIRTUAL_ROOM_DEFAULT_SELECTION_FEE_MODE;
  try {
    await AddonFee.create({
      restaurantId: reservation.restaurantId,
      reservationId: reservation._id,
      addon: ADDON,
      partySize: reservation.partySize,
      unitFeeCents,
      feeCents: virtualRoomSelectionFeeCents(unitFeeCents, reservation.partySize, mode),
      status: 'pending',
      billingPeriod: utcPeriod(now),
    });
  } catch (err: unknown) {
    if ((err as { code?: number })?.code === 11000) return;
    logger.error({ err, reservationId: String(reservation._id) }, '[virtualRoom] guest fee failed');
  }
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

type RoomMedia = {
  id: string;
  kind: 'photo' | 'video';
  role: 'panorama' | 'wall' | 'capture';
  url: string;
  floorArea?: string | null;
  caption?: string | null;
  createdAt?: Date | null;
};

type AreaSettings = {
  floorArea: string;
  wallHeightM?: number | null;
  panoramaMediaId?: string | null;
  wallColor?: string | null;
  floorColor?: string | null;
  offsetXM?: number | null;
  offsetYM?: number | null;
  offsetZM?: number | null;
  guestSelectable?: boolean | null;
  selectionFeeCharged?: boolean | null;
  selectionFeeCents?: number | null;
};

function areaKey(name: string | null | undefined) {
  return (name || 'Main').trim().toLowerCase();
}

function mediaForArea(media: RoomMedia[], area: string) {
  return media.filter((m) => !m.floorArea || areaKey(m.floorArea) === areaKey(area));
}

function roomMedia(room: VirtualRoomDocument | null): RoomMedia[] {
  return ((room?.media ?? []) as unknown as RoomMedia[]).map((m) => ({
    id: m.id,
    kind: m.kind,
    role: m.role,
    url: m.url,
    floorArea: m.floorArea ?? null,
    caption: m.caption ?? null,
    createdAt: m.createdAt ?? null,
  }));
}

function roomAreaSettings(room: VirtualRoomDocument | null): AreaSettings[] {
  return ((room?.areaSettings ?? []) as unknown as AreaSettings[]).map((s) => ({
    floorArea: s.floorArea,
    wallHeightM: s.wallHeightM ?? null,
    panoramaMediaId: s.panoramaMediaId ?? null,
    wallColor: s.wallColor ?? null,
    floorColor: s.floorColor ?? null,
    offsetXM: s.offsetXM ?? 0,
    offsetYM: s.offsetYM ?? 0,
    offsetZM: s.offsetZM ?? 0,
    guestSelectable: s.guestSelectable !== false,
    selectionFeeCharged: s.selectionFeeCharged !== false,
    selectionFeeCents:
      typeof s.selectionFeeCents === 'number' ? s.selectionFeeCents : null,
  }));
}

function roomAreaLayoutMode(room: VirtualRoomDocument | null): VirtualRoomAreaLayoutMode {
  const raw = (room as { areaLayoutMode?: string } | null)?.areaLayoutMode;
  if (raw === 'stack' || raw === 'adjacent' || raw === 'custom') return raw;
  return VIRTUAL_ROOM_DEFAULT_AREA_LAYOUT_MODE;
}

function placementForArea(
  setting: AreaSettings | undefined,
  suggested: { offsetXM: number; offsetYM: number; offsetZM: number } | undefined,
  layoutMode: VirtualRoomAreaLayoutMode,
) {
  if (layoutMode === 'custom' || !suggested) {
    return {
      offsetXM: setting?.offsetXM ?? DEFAULT_VIRTUAL_ROOM_AREA_PLACEMENT.offsetXM,
      offsetYM: setting?.offsetYM ?? DEFAULT_VIRTUAL_ROOM_AREA_PLACEMENT.offsetYM,
      offsetZM: setting?.offsetZM ?? DEFAULT_VIRTUAL_ROOM_AREA_PLACEMENT.offsetZM,
    };
  }
  // Stack / adjacent always derive from the current layout so wall-height edits stay in sync.
  return {
    offsetXM: suggested.offsetXM,
    offsetYM: suggested.offsetYM,
    offsetZM: suggested.offsetZM,
  };
}

function modelTransform(room: VirtualRoomDocument | null) {
  const raw = (room?.modelTransform ?? {}) as Partial<typeof DEFAULT_VIRTUAL_ROOM_MODEL_TRANSFORM>;
  return {
    scale: raw.scale ?? DEFAULT_VIRTUAL_ROOM_MODEL_TRANSFORM.scale,
    rotationDeg: raw.rotationDeg ?? DEFAULT_VIRTUAL_ROOM_MODEL_TRANSFORM.rotationDeg,
    offsetXM: raw.offsetXM ?? DEFAULT_VIRTUAL_ROOM_MODEL_TRANSFORM.offsetXM,
    offsetZM: raw.offsetZM ?? DEFAULT_VIRTUAL_ROOM_MODEL_TRANSFORM.offsetZM,
  };
}

/** Published floor plan + room media → renderable scene (grid units; client converts to meters). */
export async function buildVirtualRoomScene(restaurantId: string, room: VirtualRoomDocument | null) {
  const restaurant = await Restaurant.findById(restaurantId).select(
    'floorFixtures floorRooms floorPlanScale floorPlanAreaAppearances floorPlanBackgroundUrl floorPlanBackgroundColor',
  );
  if (!restaurant) throw new NotFoundError('Restaurant');
  const tables = await Table.find({
    restaurantId,
    active: true,
    privateDiningOnly: { $ne: true },
  })
    .select(
      'name shape posX posY width height rotation minCapacity maxCapacity floorArea photoUrl virtualRoomSelectable virtualRoomSelectionFeeEnabled virtualRoomSelectionFeeCents',
    )
    .sort({ floorArea: 1, name: 1 });

  const fixtures = (restaurant.floorFixtures ?? []) as Array<{
    id: string;
    name: string;
    kind: string;
    floorArea?: string | null;
    posX?: number;
    posY?: number;
    width?: number;
    height?: number;
    rotation?: number;
  }>;
  const polygons = (restaurant.floorRooms ?? []) as Array<{
    id: string;
    name: string;
    floorArea?: string | null;
    points: Array<{ x: number; y: number }>;
  }>;

  const areaNames: string[] = [];
  const seen = new Set<string>();
  const addArea = (name: string | null | undefined) => {
    const display = (name || 'Main').trim() || 'Main';
    if (seen.has(areaKey(display))) return;
    seen.add(areaKey(display));
    areaNames.push(display);
  };
  tables.forEach((t) => addArea(t.floorArea));
  fixtures.forEach((f) => addArea(f.floorArea));
  polygons.forEach((p) => addArea(p.floorArea));
  if (!areaNames.length) addArea('Main');

  const media = roomMedia(room);
  const settings = roomAreaSettings(room);
  const layoutMode = roomAreaLayoutMode(room);
  const appearances = (restaurant.floorPlanAreaAppearances ?? []) as FloorPlanAreaAppearance[];
  const scale = restaurant.floorPlanScale as { unit?: string; unitsPerCell?: number } | undefined;
  const metersPerCell = metersPerGridCell(scale);

  const draftAreas = areaNames.map((name) => {
    const key = areaKey(name);
    const areaTables = tables.filter((t) => areaKey(t.floorArea) === key);
    const areaFixtures = fixtures.filter((f) => areaKey(f.floorArea) === key);
    const areaRooms = polygons.filter((p) => areaKey(p.floorArea) === key);
    const setting = settings.find((s) => areaKey(s.floorArea) === key);
    const appearance = resolveFloorAreaAppearance(name, appearances, {
      backgroundColor: restaurant.floorPlanBackgroundColor ?? null,
      backgroundUrl: restaurant.floorPlanBackgroundUrl ?? null,
    });
    const scoped = mediaForArea(media, name);
    const panorama =
      (setting?.panoramaMediaId && media.find((m) => m.id === setting.panoramaMediaId)) ||
      scoped.find((m) => m.role === 'panorama' && m.kind === 'photo');

    const rects = [
      ...areaTables.map((t) => ({ x: t.posX ?? 0, y: t.posY ?? 0, w: t.width ?? 2, h: t.height ?? 2 })),
      ...areaFixtures.map((f) => ({ x: f.posX ?? 0, y: f.posY ?? 0, w: f.width ?? 2, h: f.height ?? 1 })),
      ...areaRooms.flatMap((r) => r.points.map((p) => ({ x: p.x, y: p.y, w: 0, h: 0 }))),
    ];
    const bounds = rects.length
      ? {
          minX: Math.min(...rects.map((r) => r.x)),
          minY: Math.min(...rects.map((r) => r.y)),
          maxX: Math.max(...rects.map((r) => r.x + r.w)),
          maxY: Math.max(...rects.map((r) => r.y + r.h)),
        }
      : { minX: 0, minY: 0, maxX: 10, maxY: 8 };

    return {
      name,
      wallHeightM: setting?.wallHeightM ?? VIRTUAL_ROOM_DEFAULT_WALL_HEIGHT_M,
      wallColor: setting?.wallColor ?? null,
      floorColor: setting?.floorColor ?? appearance.backgroundColor ?? null,
      floorImageUrl: appearance.backgroundUrl ?? null,
      panoramaUrl: panorama?.url ?? null,
      wallPhotoUrls: scoped.filter((m) => m.role === 'wall' && m.kind === 'photo').map((m) => m.url),
      bounds,
      setting,
      tables: areaTables.map((t) => ({
        id: t._id.toString(),
        name: t.name,
        shape: t.shape ?? 'rect',
        posX: t.posX ?? 0,
        posY: t.posY ?? 0,
        width: t.width ?? 2,
        height: t.height ?? 2,
        rotation: t.rotation ?? 0,
        minCapacity: t.minCapacity,
        maxCapacity: t.maxCapacity,
        photoUrl: t.photoUrl ?? null,
        virtualRoomSelectable:
          (t as { virtualRoomSelectable?: boolean }).virtualRoomSelectable !== false,
        virtualRoomSelectionFeeEnabled: Boolean(
          (t as { virtualRoomSelectionFeeEnabled?: boolean }).virtualRoomSelectionFeeEnabled,
        ),
        virtualRoomSelectionFeeCents:
          typeof (t as { virtualRoomSelectionFeeCents?: number }).virtualRoomSelectionFeeCents ===
          'number'
            ? (t as { virtualRoomSelectionFeeCents?: number }).virtualRoomSelectionFeeCents!
            : null,
      })),
      fixtures: areaFixtures.map((f) => ({
        id: f.id,
        name: f.name,
        kind: f.kind,
        posX: f.posX ?? 0,
        posY: f.posY ?? 0,
        width: f.width ?? 2,
        height: f.height ?? 1,
        rotation: f.rotation ?? 0,
      })),
      rooms: areaRooms.map((r) => ({
        id: r.id,
        name: r.name,
        points: r.points.map((p) => ({ x: p.x, y: p.y })),
      })),
    };
  });

  const suggested =
    layoutMode === 'stack' || layoutMode === 'adjacent'
      ? suggestVirtualRoomAreaPlacements(
          draftAreas.map((a) => ({ name: a.name, bounds: a.bounds, wallHeightM: a.wallHeightM })),
          layoutMode,
          metersPerCell,
        )
      : [];

  const areas = draftAreas.map((area) => {
    const suggestion = suggested.find((s) => areaKey(s.floorArea) === areaKey(area.name));
    const placement = placementForArea(area.setting, suggestion, layoutMode);
    const { setting: _setting, ...rest } = area;
    return {
      ...rest,
      offsetXM: placement.offsetXM,
      offsetYM: placement.offsetYM,
      offsetZM: placement.offsetZM,
      guestSelectable: area.setting?.guestSelectable !== false,
      selectionFeeCharged: area.setting?.selectionFeeCharged !== false,
      selectionFeeCents:
        typeof area.setting?.selectionFeeCents === 'number' ? area.setting.selectionFeeCents : null,
    };
  });

  const reconstruction = room?.reconstruction;
  const modelUrl =
    room?.useReconstructedModel !== false &&
    reconstruction?.status === 'ready' &&
    reconstruction.modelUrl
      ? reconstruction.modelUrl
      : null;

  const pricing = await getVirtualRoomPricing();
  const restaurantDoc = await Restaurant.findById(restaurantId)
    .select(
      'virtualRoomSelectionFeeEnabled virtualRoomSelectionFeeMode virtualRoomSelectionFeeCents virtualRoomSelectionFeeApplyTo',
    )
    .lean();
  const restFee = restaurantDoc as {
    virtualRoomSelectionFeeEnabled?: boolean;
    virtualRoomSelectionFeeMode?: VirtualRoomSelectionFeeMode | null;
    virtualRoomSelectionFeeCents?: number | null;
    virtualRoomSelectionFeeApplyTo?: 'all' | 'selected' | null;
  } | null;

  return {
    restaurantId,
    unit: scale?.unit === 'm' ? 'm' : 'ft',
    unitsPerCell: scale?.unitsPerCell ?? 2,
    metersPerCell,
    areaLayoutMode: layoutMode,
    modelUrl,
    modelTransform: modelTransform(room),
    areas,
    selectionFeePayer: pricing.selectionFeePayer,
    selectionFeeEnabled: restFee?.virtualRoomSelectionFeeEnabled !== false,
    selectionFeeMode:
      restFee?.virtualRoomSelectionFeeMode === 'per_table' ||
      restFee?.virtualRoomSelectionFeeMode === 'per_guest'
        ? restFee.virtualRoomSelectionFeeMode
        : pricing.selectionFeeMode,
    selectionFeeUnitCents:
      typeof restFee?.virtualRoomSelectionFeeCents === 'number'
        ? Math.max(0, Math.round(restFee.virtualRoomSelectionFeeCents))
        : pricing.perGuestFeeCents,
    platformSelectionFeeUnitCents: pricing.perGuestFeeCents,
    restaurantSelectionFeeUnitCents:
      typeof restFee?.virtualRoomSelectionFeeCents === 'number'
        ? Math.max(0, Math.round(restFee.virtualRoomSelectionFeeCents))
        : null,
    selectionFeeApplyTo:
      restFee?.virtualRoomSelectionFeeApplyTo === 'selected' ? 'selected' : 'all',
  };
}

/**
 * Live-floor / ops scene. Built from the published floor plan (+ any saved VirtualRoom
 * look). Does not upsert a room doc and does not require the add-on — hosts can view it.
 */
export async function getVirtualRoomOpsScene(restaurantId: string) {
  const room = await VirtualRoom.findOne({ restaurantId });
  return buildVirtualRoomScene(restaurantId, room);
}

/** Diner-facing scene. Null unless the add-on is active and the partner published the room. */
export async function getPublicVirtualRoom(restaurantId: string) {
  const restaurant = await Restaurant.findById(restaurantId).select('status');
  if (!restaurant || restaurant.status !== 'approved') return null;
  const room = await VirtualRoom.findOne({ restaurantId, published: true });
  if (!room) return null;
  if (!(await isVirtualRoomAddonActive(restaurantId))) return null;
  return buildVirtualRoomScene(restaurantId, room);
}

/** True when the diner may pick a table through the 3D room for this booking. */
export async function canSelectTableIn3d(restaurantId: string) {
  const room = await VirtualRoom.findOne({ restaurantId, published: true }).select('_id');
  if (!room) return false;
  return isVirtualRoomAddonActive(restaurantId);
}

// ---------------------------------------------------------------------------
// Partner editor
// ---------------------------------------------------------------------------

async function getOrCreateRoom(restaurantId: string) {
  const room = await VirtualRoom.findOneAndUpdate(
    { restaurantId },
    { $setOnInsert: { restaurantId } },
    { upsert: true, new: true },
  );
  return room as VirtualRoomDocument;
}

async function requireActiveAddon(restaurantId: string) {
  const status = await getVirtualRoomAddonStatus(restaurantId);
  if (!status.active) {
    throw new ValidationError(
      status.ineligibleReason ?? 'Turn on the Virtual 3D room add-on in Billing first.',
    );
  }
}

export async function getVirtualRoomEditor(restaurantId: string) {
  const room = await getOrCreateRoom(restaurantId);
  const [addon, scene, restaurant] = await Promise.all([
    getVirtualRoomAddonStatus(restaurantId),
    buildVirtualRoomScene(restaurantId, room),
    Restaurant.findById(restaurantId).select(
      'virtualRoomSelectionFeeEnabled virtualRoomSelectionFeeMode virtualRoomSelectionFeeCents virtualRoomSelectionFeeApplyTo',
    ),
  ]);
  const media = roomMedia(room);
  const reconstruction = room.reconstruction ?? { status: 'idle' };
  return {
    restaurantId,
    published: Boolean(room.published),
    publishedAt: room.publishedAt ?? null,
    useReconstructedModel: room.useReconstructedModel !== false,
    areaLayoutMode: roomAreaLayoutMode(room),
    modelTransform: modelTransform(room),
    providerConfigured: isReconstructionProviderConfigured(),
    addon,
    selectionFee: {
      enabled: restaurant?.virtualRoomSelectionFeeEnabled !== false,
      mode:
        restaurant?.virtualRoomSelectionFeeMode === 'per_table' ||
        restaurant?.virtualRoomSelectionFeeMode === 'per_guest'
          ? restaurant.virtualRoomSelectionFeeMode
          : null,
      feeCents:
        typeof restaurant?.virtualRoomSelectionFeeCents === 'number'
          ? restaurant.virtualRoomSelectionFeeCents
          : null,
      applyTo: restaurant?.virtualRoomSelectionFeeApplyTo === 'selected' ? 'selected' : 'all',
    },
    media,
    areaSettings: roomAreaSettings(room),
    reconstruction: {
      status: reconstruction.status ?? 'idle',
      provider: reconstruction.provider ?? null,
      sourceKind: reconstruction.sourceKind ?? null,
      sourceCount: reconstruction.sourceCount ?? null,
      modelUrl: reconstruction.modelUrl ?? null,
      error: reconstruction.error ?? null,
      requestedAt: reconstruction.requestedAt ?? null,
      completedAt: reconstruction.completedAt ?? null,
    },
    scene,
  };
}

export async function updateVirtualRoom(restaurantId: string, rawInput: unknown) {
  await requireActiveAddon(restaurantId);
  const input = virtualRoomUpdateInputSchema.parse(rawInput);
  const room = await getOrCreateRoom(restaurantId);
  const media = roomMedia(room);

  if (input.areaLayoutMode) {
    room.set('areaLayoutMode', input.areaLayoutMode);
  }
  if (input.areaSettings) {
    const next = roomAreaSettings(room);
    for (const s of input.areaSettings) {
      if (s.panoramaMediaId) {
        const pano = media.find((m) => m.id === s.panoramaMediaId);
        if (!pano || pano.role !== 'panorama') {
          throw new ValidationError('Pick an uploaded 360° panorama photo');
        }
      }
      const prev = next.find((n) => areaKey(n.floorArea) === areaKey(s.floorArea));
      const entry: AreaSettings = {
        floorArea: s.floorArea,
        wallHeightM: s.wallHeightM ?? null,
        panoramaMediaId: s.panoramaMediaId ?? null,
        wallColor: s.wallColor ?? null,
        floorColor: s.floorColor ?? null,
        offsetXM: s.offsetXM ?? prev?.offsetXM ?? 0,
        offsetYM: s.offsetYM ?? prev?.offsetYM ?? 0,
        offsetZM: s.offsetZM ?? prev?.offsetZM ?? 0,
        guestSelectable: s.guestSelectable ?? prev?.guestSelectable ?? true,
        selectionFeeCharged: s.selectionFeeCharged ?? prev?.selectionFeeCharged ?? true,
        selectionFeeCents:
          s.selectionFeeCents !== undefined
            ? s.selectionFeeCents
            : (prev?.selectionFeeCents ?? null),
      };
      const idx = next.findIndex((n) => areaKey(n.floorArea) === areaKey(s.floorArea));
      if (idx >= 0) next[idx] = entry;
      else next.push(entry);
    }
    room.set('areaSettings', next);
    // Saving explicit offsets implies a custom layout unless the caller also set the mode.
    if (
      !input.areaLayoutMode &&
      input.areaSettings.some(
        (s) => s.offsetXM != null || s.offsetYM != null || s.offsetZM != null,
      )
    ) {
      room.set('areaLayoutMode', 'custom');
    }
  }
  if (input.useReconstructedModel !== undefined) {
    room.useReconstructedModel = input.useReconstructedModel;
  }
  if (input.modelTransform) {
    room.set('modelTransform', input.modelTransform);
  }
  await room.save();
  return getVirtualRoomEditor(restaurantId);
}

export async function addVirtualRoomMedia(restaurantId: string, rawInput: unknown) {
  await requireActiveAddon(restaurantId);
  const input = virtualRoomMediaInputSchema.parse(rawInput);
  if (!isOwnUploadUrl(input.url)) {
    throw new ValidationError('Upload the file through the dashboard first');
  }
  if (input.kind === 'video' && input.role !== 'capture') {
    throw new ValidationError('Videos are used for 3D scanning only');
  }
  const room = await getOrCreateRoom(restaurantId);
  if ((room.media?.length ?? 0) >= VIRTUAL_ROOM_MAX_MEDIA) {
    throw new ValidationError(`A room can hold up to ${VIRTUAL_ROOM_MAX_MEDIA} photos and videos`);
  }
  room.media.push({
    id: crypto.randomUUID(),
    kind: input.kind,
    role: input.role,
    url: input.url,
    floorArea: input.floorArea?.trim() || undefined,
    caption: input.caption?.trim() || undefined,
    createdAt: new Date(),
  });
  await room.save();
  return getVirtualRoomEditor(restaurantId);
}

export async function removeVirtualRoomMedia(restaurantId: string, mediaId: string) {
  const room = await VirtualRoom.findOne({ restaurantId });
  if (!room) throw new NotFoundError('Virtual room');
  const before = room.media.length;
  room.set(
    'media',
    roomMedia(room).filter((m) => m.id !== mediaId),
  );
  if (room.media.length === before) throw new NotFoundError('Media');
  room.set(
    'areaSettings',
    roomAreaSettings(room).map((s) =>
      s.panoramaMediaId === mediaId ? { ...s, panoramaMediaId: null } : s,
    ),
  );
  await room.save();
  return getVirtualRoomEditor(restaurantId);
}

export async function publishVirtualRoom(restaurantId: string, published: boolean) {
  if (published) {
    await requireActiveAddon(restaurantId);
    const tableCount = await Table.countDocuments({ restaurantId, active: true });
    if (tableCount === 0) {
      throw new ValidationError('Add tables to your floor plan before publishing the 3D room');
    }
  }
  const room = await getOrCreateRoom(restaurantId);
  room.published = published;
  if (published) room.publishedAt = new Date();
  await room.save();
  return getVirtualRoomEditor(restaurantId);
}
