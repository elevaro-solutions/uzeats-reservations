import {
  normalizeFloorAreaName,
  removeFloorAreaAppearance,
  renameFloorAreaAppearance,
  sameFloorArea,
  upsertFloorAreaAppearance,
  type FloorPlanAreaAppearance,
} from '@reservations/shared';
import { Restaurant } from '../models/Restaurant.js';
import { Table } from '../models/Table.js';
import { VirtualRoom } from '../models/VirtualRoom.js';

type AppearanceRow = {
  floorArea?: string | null;
  backgroundColor?: string | null;
  backgroundUrl?: string | null;
};

type FixtureRow = {
  id: string;
  name: string;
  kind: string;
  floorArea?: string | null;
  posX?: number;
  posY?: number;
  width?: number;
  height?: number;
  rotation?: number;
};

type RoomRow = {
  id: string;
  name: string;
  floorArea?: string | null;
  points: Array<{ x: number; y: number }>;
};

function asAppearances(raw: unknown): FloorPlanAreaAppearance[] {
  if (!Array.isArray(raw)) return [];
  return (raw as AppearanceRow[])
    .filter((a) => a?.floorArea)
    .map((a) => ({
      floorArea: normalizeFloorAreaName(a.floorArea) || 'Main',
      backgroundColor: a.backgroundColor ?? null,
      backgroundUrl: a.backgroundUrl ?? null,
    }));
}

function renameFixtures(raw: unknown, from: string, to: string): FixtureRow[] | null {
  if (!Array.isArray(raw)) return null;
  return (raw as FixtureRow[]).map((f) =>
    sameFloorArea(f.floorArea, from) ? { ...f, floorArea: to } : { ...f },
  );
}

function renameRooms(raw: unknown, from: string, to: string): RoomRow[] | null {
  if (!Array.isArray(raw)) return null;
  return (raw as RoomRow[]).map((r) =>
    sameFloorArea(r.floorArea, from) ? { ...r, floorArea: to } : { ...r },
  );
}

function countFixturesInArea(raw: unknown, area: string): number {
  if (!Array.isArray(raw)) return 0;
  return (raw as FixtureRow[]).filter((f) => sameFloorArea(f.floorArea, area)).length;
}

function countRoomsInArea(raw: unknown, area: string): number {
  if (!Array.isArray(raw)) return 0;
  return (raw as RoomRow[]).filter((r) => sameFloorArea(r.floorArea, area)).length;
}

async function renameVirtualRoomArea(restaurantId: string, from: string, to: string) {
  const room = await VirtualRoom.findOne({ restaurantId });
  if (!room) return;

  let changed = false;
  const settings = (room.areaSettings ?? []) as Array<{ floorArea?: string | null }>;
  for (const s of settings) {
    if (sameFloorArea(s.floorArea, from)) {
      s.floorArea = to;
      changed = true;
    }
  }
  const media = (room.media ?? []) as Array<{ floorArea?: string | null }>;
  for (const m of media) {
    if (m.floorArea && sameFloorArea(m.floorArea, from)) {
      m.floorArea = to;
      changed = true;
    }
  }
  if (changed) {
    room.markModified('areaSettings');
    room.markModified('media');
    await room.save();
  }
}

async function deleteVirtualRoomArea(restaurantId: string, name: string) {
  const room = await VirtualRoom.findOne({ restaurantId });
  if (!room) return;

  const beforeSettings = (room.areaSettings ?? []).length;
  room.areaSettings = (room.areaSettings ?? []).filter(
    (s: { floorArea?: string | null }) => !sameFloorArea(s.floorArea, name),
  ) as typeof room.areaSettings;

  let mediaChanged = false;
  for (const m of room.media ?? []) {
    if (m.floorArea && sameFloorArea(m.floorArea, name)) {
      m.floorArea = undefined;
      mediaChanged = true;
    }
  }

  if (beforeSettings !== room.areaSettings.length || mediaChanged) {
    room.markModified('areaSettings');
    if (mediaChanged) room.markModified('media');
    await room.save();
  }
}

function patchDraftAreaAppearances(
  restaurant: InstanceType<typeof Restaurant>,
  nextAppearances: FloorPlanAreaAppearance[],
) {
  const draft = restaurant.floorPlanDraft as
    | {
        updatedAt?: Date;
        backgroundUrl?: string | null;
        backgroundColor?: string | null;
        areaAppearances?: unknown;
        fixtures?: unknown;
        positions?: unknown;
        rooms?: unknown;
        scale?: unknown;
      }
    | undefined;
  if (!draft?.updatedAt) return;
  restaurant.floorPlanDraft = {
    ...draft,
    updatedAt: draft.updatedAt,
    areaAppearances: nextAppearances,
  } as typeof restaurant.floorPlanDraft;
}

function patchDraftRename(
  restaurant: InstanceType<typeof Restaurant>,
  from: string,
  to: string,
) {
  const draft = restaurant.floorPlanDraft as
    | {
        updatedAt?: Date;
        backgroundUrl?: string | null;
        backgroundColor?: string | null;
        areaAppearances?: unknown;
        fixtures?: unknown;
        positions?: unknown;
        rooms?: unknown;
        scale?: unknown;
      }
    | undefined;
  if (!draft?.updatedAt) return;

  restaurant.floorPlanDraft = {
    ...draft,
    updatedAt: draft.updatedAt,
    areaAppearances: renameFloorAreaAppearance(asAppearances(draft.areaAppearances), from, to),
    fixtures: renameFixtures(draft.fixtures, from, to) ?? draft.fixtures,
    rooms: renameRooms(draft.rooms, from, to) ?? draft.rooms,
  } as typeof restaurant.floorPlanDraft;
}

/**
 * Ensure a named floor area exists (empty appearance entry) so partners can
 * configure canvas color / assign tables before any table uses it.
 */
export async function ensureFloorAreaDoc(restaurantId: string, name: string) {
  const area = normalizeFloorAreaName(name) || 'Main';
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');

  const published = asAppearances(restaurant.floorPlanAreaAppearances);
  const existing = published.find((a) => sameFloorArea(a.floorArea, area));
  if (!existing) {
    restaurant.floorPlanAreaAppearances = upsertFloorAreaAppearance(published, {
      floorArea: area,
      backgroundColor: null,
      backgroundUrl: null,
    }) as typeof restaurant.floorPlanAreaAppearances;
  }

  const draft = restaurant.floorPlanDraft as { updatedAt?: Date; areaAppearances?: unknown } | undefined;
  if (draft?.updatedAt) {
    const draftAppearances = asAppearances(draft.areaAppearances);
    if (!draftAppearances.some((a) => sameFloorArea(a.floorArea, area))) {
      patchDraftAreaAppearances(
        restaurant,
        upsertFloorAreaAppearance(draftAppearances, {
          floorArea: area,
          backgroundColor: null,
          backgroundUrl: null,
        }),
      );
    }
  }

  await restaurant.save();
  return restaurant;
}

/**
 * Rename a floor area across tables, published layout meta, draft, and Virtual Room.
 */
export async function renameFloorAreaDoc(
  restaurantId: string,
  fromRaw: string,
  toRaw: string,
) {
  const from = normalizeFloorAreaName(fromRaw);
  const to = normalizeFloorAreaName(toRaw);
  if (!from) throw new Error('Current area name is required');
  if (!to) throw new Error('New area name is required');
  if (sameFloorArea(from, to)) {
    // Case / whitespace-only change still rewrites display casing when different.
    if (from === to) {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) throw new Error('Restaurant not found');
      return restaurant;
    }
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');

  const published = asAppearances(restaurant.floorPlanAreaAppearances);
  const draft = restaurant.floorPlanDraft as
    | { updatedAt?: Date; areaAppearances?: unknown; fixtures?: unknown; rooms?: unknown }
    | undefined;
  const draftAppearances = draft?.updatedAt ? asAppearances(draft.areaAppearances) : [];

  const knownNames = new Set<string>();
  for (const a of [...published, ...draftAppearances]) {
    knownNames.add((a.floorArea || 'Main').toLowerCase());
  }
  const tables = await Table.find({ restaurantId }).select('floorArea').lean();
  for (const t of tables) {
    knownNames.add((normalizeFloorAreaName(t.floorArea) || 'Main').toLowerCase());
  }
  for (const f of restaurant.floorFixtures ?? []) {
    knownNames.add((normalizeFloorAreaName(f.floorArea) || 'Main').toLowerCase());
  }
  for (const r of restaurant.floorRooms ?? []) {
    knownNames.add((normalizeFloorAreaName(r.floorArea) || 'Main').toLowerCase());
  }

  if (!sameFloorArea(from, to) && knownNames.has(to.toLowerCase())) {
    throw new Error(`Floor area "${to}" already exists`);
  }

  const toUpdate = await Table.find({ restaurantId });
  for (const table of toUpdate) {
    if (sameFloorArea(table.floorArea || 'Main', from)) {
      table.floorArea = to;
      await table.save();
    }
  }

  restaurant.floorPlanAreaAppearances = renameFloorAreaAppearance(
    published,
    from,
    to,
  ) as typeof restaurant.floorPlanAreaAppearances;

  const renamedFixtures = renameFixtures(restaurant.floorFixtures, from, to);
  if (renamedFixtures) {
    restaurant.floorFixtures = renamedFixtures as typeof restaurant.floorFixtures;
  }
  const renamedRooms = renameRooms(restaurant.floorRooms, from, to);
  if (renamedRooms) {
    restaurant.floorRooms = renamedRooms as typeof restaurant.floorRooms;
  }

  patchDraftRename(restaurant, from, to);
  await restaurant.save();
  await renameVirtualRoomArea(restaurantId, from, to);
  return restaurant;
}

/**
 * Delete an empty floor area (no tables). Fixtures/rooms in that area block delete.
 */
export async function deleteFloorAreaDoc(restaurantId: string, nameRaw: string) {
  const name = normalizeFloorAreaName(nameRaw);
  if (!name) throw new Error('Area name is required');
  if (sameFloorArea(name, 'Main')) {
    throw new Error('The Main area cannot be deleted');
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');

  const allTables = await Table.find({ restaurantId }).select('floorArea').lean();
  const tablesInArea = allTables.filter((t) =>
    sameFloorArea(t.floorArea || 'Main', name),
  ).length;
  if (tablesInArea > 0) {
    throw new Error(
      `Move or delete ${tablesInArea} table${
        tablesInArea === 1 ? '' : 's'
      } in "${name}" before removing this area`,
    );
  }

  const draft = restaurant.floorPlanDraft as
    | { updatedAt?: Date; fixtures?: unknown; rooms?: unknown; areaAppearances?: unknown }
    | undefined;
  const fixtureCount =
    countFixturesInArea(restaurant.floorFixtures, name) +
    (draft?.updatedAt ? countFixturesInArea(draft.fixtures, name) : 0);
  const roomCount =
    countRoomsInArea(restaurant.floorRooms, name) +
    (draft?.updatedAt ? countRoomsInArea(draft.rooms, name) : 0);
  if (fixtureCount > 0 || roomCount > 0) {
    throw new Error(
      `Remove fixtures or room outlines in "${name}" on the table layout before deleting this area`,
    );
  }

  restaurant.floorPlanAreaAppearances = removeFloorAreaAppearance(
    asAppearances(restaurant.floorPlanAreaAppearances),
    name,
  ) as typeof restaurant.floorPlanAreaAppearances;

  if (draft?.updatedAt) {
    patchDraftAreaAppearances(
      restaurant,
      removeFloorAreaAppearance(asAppearances(draft.areaAppearances), name),
    );
  }

  await restaurant.save();
  await deleteVirtualRoomArea(restaurantId, name);
  return restaurant;
}
