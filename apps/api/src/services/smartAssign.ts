import mongoose from 'mongoose';
import { Table, type TableDocument } from '../models/Table.js';
import { Reservation } from '../models/Reservation.js';
import { User } from '../models/User.js';
import { findClaimedTableIds } from './tableSlotClaims.js';

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

interface ScoredTable {
  table: TableDocument & { _id: mongoose.Types.ObjectId };
  score: number;
}

export async function smartAssignTable(input: {
  restaurantId: string;
  partySize: number;
  slotStart: Date;
  slotEnd: Date;
  dinerId?: string;
}): Promise<(TableDocument & { _id: mongoose.Types.ObjectId }) | null> {
  const tables = await Table.find({
    restaurantId: input.restaurantId,
    active: true,
    minCapacity: { $lte: input.partySize },
    maxCapacity: { $gte: input.partySize },
  });

  if (tables.length === 0) return null;

  const windowStart = new Date(input.slotStart.getTime() - 3 * 60 * 60_000);
  const windowEnd = new Date(input.slotEnd.getTime() + 3 * 60 * 60_000);

  const existing = await Reservation.find({
    restaurantId: input.restaurantId,
    status: { $in: ['pending', 'confirmed', 'seated'] },
    slotStart: { $lt: windowEnd },
    slotEnd: { $gt: windowStart },
  });

  const claimedIds = await findClaimedTableIds({
    restaurantId: input.restaurantId,
    slotStart: input.slotStart,
    slotEnd: input.slotEnd,
  });

  let preferredTableName: string | undefined;
  if (input.dinerId) {
    const diner = await User.findById(input.dinerId).select('preferredTable');
    preferredTableName = (diner as any)?.preferredTable;
  }

  const floorAreaCounts = new Map<string, number>();
  for (const r of existing) {
    if (!overlaps(input.slotStart, input.slotEnd, r.slotStart, r.slotEnd)) continue;
    for (const tId of r.tableIds) {
      const t = tables.find((tb) => tb._id.equals(tId));
      if (t) {
        floorAreaCounts.set(t.floorArea, (floorAreaCounts.get(t.floorArea) ?? 0) + 1);
      }
    }
  }

  const scored: ScoredTable[] = [];

  for (const table of tables) {
    if (claimedIds.has(String(table._id))) continue;
    const conflict = existing.some(
      (r) =>
        r.tableIds.some((id) => id.equals(table._id)) &&
        overlaps(input.slotStart, input.slotEnd, r.slotStart, r.slotEnd),
    );
    if (conflict) continue;

    let score = 0;

    // Fit score: prefer tables closest to party size (0-30 points)
    const wastedSeats = table.maxCapacity - input.partySize;
    score += Math.max(0, 30 - wastedSeats * 10);

    // Turnover score: prefer tables that leave adjacent slots free (0-20 points)
    const adjacentConflicts = existing.filter(
      (r) =>
        r.tableIds.some((id) => id.equals(table._id)) &&
        overlaps(windowStart, windowEnd, r.slotStart, r.slotEnd),
    ).length;
    score += Math.max(0, 20 - adjacentConflicts * 5);

    // Section balance: prefer less-loaded floor areas (0-20 points)
    const areaLoad = floorAreaCounts.get(table.floorArea) ?? 0;
    score += Math.max(0, 20 - areaLoad * 4);

    // Guest preference: boost if diner prefers this table (0-15 points)
    if (preferredTableName && table.name === preferredTableName) {
      score += 15;
    }

    // Combinable bonus: prefer non-combinable (single) tables (0-15 points)
    score += table.combinable ? 0 : 15;

    scored.push({ table: table as any, score });
  }

  if (scored.length === 0) return null;

  scored.sort((a, b) => b.score - a.score);
  return scored[0]!.table;
}
