import mongoose from 'mongoose';
import {
  PrivateDiningSpace,
  type PrivateDiningSpaceDocument,
} from '../models/PrivateDining.js';
import { Table } from '../models/Table.js';

function asObjectIds(ids: unknown): mongoose.Types.ObjectId[] {
  if (!Array.isArray(ids)) return [];
  const out: mongoose.Types.ObjectId[] = [];
  for (const id of ids) {
    if (id instanceof mongoose.Types.ObjectId) {
      out.push(id);
      continue;
    }
    const raw = String(id ?? '');
    if (mongoose.Types.ObjectId.isValid(raw)) {
      out.push(new mongoose.Types.ObjectId(raw));
    }
  }
  return out;
}

async function uniquePrivateTableName(
  restaurantId: mongoose.Types.ObjectId | string,
  baseName: string,
): Promise<string> {
  const trimmed = baseName.trim() || 'Private room';
  const existing = await Table.find({
    restaurantId,
    name: { $regex: `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( \\d+)?$` },
  })
    .select('name')
    .lean();
  const taken = new Set(existing.map((t) => t.name));
  if (!taken.has(trimmed)) return trimmed;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${trimmed} ${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${trimmed} ${Date.now()}`;
}

/**
 * Ensure a private dining space has at least one floor-plan table that matches
 * its guest range. Private dining is inventory via those tables; without them
 * availability returns no slots for large parties.
 */
export async function ensurePrivateDiningBackingTables(
  space: PrivateDiningSpaceDocument,
): Promise<mongoose.Types.ObjectId[]> {
  const linkedIds = asObjectIds(space.tableIds);
  if (linkedIds.length > 0) {
    const linked = await Table.find({
      _id: { $in: linkedIds },
      restaurantId: space.restaurantId,
    });
    if (linked.length > 0) {
      let dirty = false;
      for (const table of linked) {
        let changed = false;
        if (table.minCapacity !== space.minGuests) {
          table.minCapacity = space.minGuests;
          changed = true;
        }
        if (table.maxCapacity !== space.maxGuests) {
          table.maxCapacity = space.maxGuests;
          changed = true;
        }
        if (table.privateDiningOnly !== true) {
          table.privateDiningOnly = true;
          changed = true;
        }
        if (!table.active) {
          table.active = true;
          changed = true;
        }
        if (changed) {
          await table.save();
          dirty = true;
        }
      }
      const liveIds = linked.map((t) => t._id);
      if (
        dirty ||
        liveIds.length !== linkedIds.length ||
        liveIds.some((id, i) => !id.equals(linkedIds[i]!))
      ) {
        space.tableIds = liveIds;
        await space.save();
      }
      return liveIds;
    }
  }

  const name = await uniquePrivateTableName(space.restaurantId, space.name);
  const table = await Table.create({
    restaurantId: space.restaurantId,
    name,
    minCapacity: space.minGuests,
    maxCapacity: space.maxGuests,
    floorArea: 'Private',
    active: true,
    privateDiningOnly: true,
    requiresManualApproval: space.requiresManualApproval === true,
  });

  space.tableIds = [table._id];
  await space.save();
  return [table._id];
}

export async function resolvePrivateDiningTableIds(
  restaurantId: string,
  privateDiningSpaceId: string,
): Promise<mongoose.Types.ObjectId[] | null> {
  if (!mongoose.Types.ObjectId.isValid(privateDiningSpaceId)) return null;
  const space = await PrivateDiningSpace.findById(privateDiningSpaceId);
  if (!space || space.restaurantId.toString() !== restaurantId || !space.active) {
    return null;
  }
  return ensurePrivateDiningBackingTables(space);
}
