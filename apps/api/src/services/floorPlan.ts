import {
  floorPlanSaveInputSchema,
  normalizeTableShape,
  type FloorPlanSaveInput,
} from '@reservations/shared';
import { Restaurant } from '../models/Restaurant.js';
import { Table } from '../models/Table.js';

export type ParsedFloorPlanSave = FloorPlanSaveInput;

export function parseFloorPlanSaveInput(input: unknown): ParsedFloorPlanSave {
  return floorPlanSaveInputSchema.parse(input);
}

export async function applyFloorPlanPositions(
  restaurantId: string,
  positions: NonNullable<ParsedFloorPlanSave['positions']>,
) {
  const updated = [];
  for (const pos of positions) {
    const table = await Table.findOne({
      _id: pos.id,
      restaurantId,
    });
    if (!table) continue;
    table.posX = pos.posX;
    table.posY = pos.posY;
    if (pos.width != null) table.width = pos.width;
    if (pos.height != null) table.height = pos.height;
    if (pos.shape) table.shape = normalizeTableShape(pos.shape) as typeof table.shape;
    if (pos.rotation != null) table.rotation = pos.rotation;
    if (pos.combineGroupId !== undefined) {
      table.combineGroupId = pos.combineGroupId;
    }
    await table.save();
    updated.push(table);
  }
  return updated;
}

export async function saveFloorPlanDraftDoc(
  restaurantId: string,
  input: ParsedFloorPlanSave,
) {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');

  const prev = restaurant.floorPlanDraft as {
    backgroundUrl?: string | null;
    backgroundColor?: string | null;
    areaAppearances?: unknown;
    fixtures?: unknown;
    positions?: unknown;
    rooms?: unknown;
    scale?: unknown;
  } | undefined;

  restaurant.floorPlanDraft = {
    updatedAt: new Date(),
    backgroundUrl:
      input.backgroundUrl !== undefined
        ? input.backgroundUrl
        : (prev?.backgroundUrl ?? restaurant.floorPlanBackgroundUrl ?? null),
    backgroundColor:
      input.backgroundColor !== undefined
        ? input.backgroundColor
        : (prev?.backgroundColor ?? restaurant.floorPlanBackgroundColor ?? null),
    areaAppearances:
      input.areaAppearances !== undefined
        ? input.areaAppearances
        : (prev?.areaAppearances ?? restaurant.floorPlanAreaAppearances ?? []),
    fixtures:
      input.fixtures !== undefined
        ? input.fixtures
        : (prev?.fixtures ?? restaurant.floorFixtures ?? []),
    positions:
      input.positions !== undefined
        ? input.positions
        : (prev?.positions ?? []),
    rooms:
      input.rooms !== undefined
        ? input.rooms
        : (prev?.rooms ?? restaurant.floorRooms ?? []),
    scale:
      input.scale !== undefined
        ? input.scale
        : (prev?.scale ?? restaurant.floorPlanScale ?? null),
  } as typeof restaurant.floorPlanDraft;

  await restaurant.save();
  return restaurant;
}

export async function publishFloorPlanDoc(
  restaurantId: string,
  input: ParsedFloorPlanSave,
) {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');

  if (input.backgroundUrl !== undefined) {
    restaurant.floorPlanBackgroundUrl = input.backgroundUrl ?? undefined;
  }
  if (input.backgroundColor !== undefined) {
    restaurant.floorPlanBackgroundColor = input.backgroundColor ?? undefined;
  }
  if (input.areaAppearances !== undefined) {
    restaurant.floorPlanAreaAppearances =
      input.areaAppearances as typeof restaurant.floorPlanAreaAppearances;
  }
  if (input.fixtures !== undefined) {
    restaurant.floorFixtures = input.fixtures as typeof restaurant.floorFixtures;
  }
  if (input.rooms !== undefined) {
    restaurant.floorRooms = input.rooms as typeof restaurant.floorRooms;
  }
  if (input.scale !== undefined) {
    restaurant.floorPlanScale = (input.scale ?? undefined) as typeof restaurant.floorPlanScale;
  }
  if (input.positions?.length) {
    await applyFloorPlanPositions(restaurantId, input.positions);
  }

  restaurant.set('floorPlanDraft', undefined);
  restaurant.floorPlanPublishedAt = new Date();
  await restaurant.save();
  return restaurant;
}
