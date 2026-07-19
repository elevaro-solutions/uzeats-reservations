import type { AvailabilitySlot } from '@reservations/shared';
import { Blackout, Shift } from '../models/Shift.js';
import { Table } from '../models/Table.js';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { SLOT_QUANTUM_MS, TableSlotClaim } from '../models/TableSlotClaim.js';
import { findClaimedTableIds, slotKeysForRange } from './tableSlotClaims.js';

function parseHm(hm: string) {
  const [h, m] = hm.split(':').map(Number);
  return { hour: h ?? 0, minute: m ?? 0 };
}

function dateAt(dateStr: string, hm: string) {
  const { hour, minute } = parseHm(hm);
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

export async function getAvailability(params: {
  restaurantId: string;
  date: string; // YYYY-MM-DD
  partySize: number;
}): Promise<AvailabilitySlot[]> {
  const restaurant = await Restaurant.findById(params.restaurantId);
  if (!restaurant || restaurant.status !== 'approved') return [];

  const day = new Date(`${params.date}T12:00:00`);
  const dayOfWeek = day.getDay();

  const blackouts = await Blackout.find({
    restaurantId: params.restaurantId,
    date: params.date,
  });
  if (blackouts.some((b) => b.allDay)) return [];

  const shifts = await Shift.find({
    restaurantId: params.restaurantId,
    active: true,
    daysOfWeek: dayOfWeek,
  });
  if (shifts.length === 0) return [];

  const tables = await Table.find({
    restaurantId: params.restaurantId,
    active: true,
    minCapacity: { $lte: params.partySize },
    maxCapacity: { $gte: params.partySize },
  });
  if (tables.length === 0) return [];

  const dayStart = new Date(`${params.date}T00:00:00`);
  const dayEnd = new Date(`${params.date}T23:59:59`);

  const existing = await Reservation.find({
    restaurantId: params.restaurantId,
    status: { $in: ['pending', 'confirmed', 'seated'] },
    slotStart: { $lt: dayEnd },
    slotEnd: { $gt: dayStart },
  });

  // Load all claims for the day once, then test each slot in memory.
  const dayClaimKeys = slotKeysForRange(dayStart, new Date(dayEnd.getTime() + SLOT_QUANTUM_MS));
  const dayClaims = await TableSlotClaim.find({
    restaurantId: params.restaurantId,
    slotKey: { $in: dayClaimKeys },
  })
    .select('tableId slotKey')
    .lean();
  const claimsByTable = new Map<string, Set<string>>();
  for (const claim of dayClaims) {
    const tid = String(claim.tableId);
    let set = claimsByTable.get(tid);
    if (!set) {
      set = new Set();
      claimsByTable.set(tid, set);
    }
    set.add(claim.slotKey);
  }

  const slots: AvailabilitySlot[] = [];

  for (const shift of shifts) {
    const interval = shift.slotIntervalMinutes ?? 15;
    const turn = shift.turnTimeMinutes ?? 90;
    let cursor = dateAt(params.date, shift.startTime);
    const end = dateAt(params.date, shift.endTime);

    while (cursor < end) {
      const slotEnd = new Date(cursor.getTime() + turn * 60_000);
      if (slotEnd > end) break;

      const inBlackout = blackouts.some((b) => {
        if (b.allDay) return true;
        if (!b.startTime || !b.endTime) return false;
        const bs = dateAt(params.date, b.startTime);
        const be = dateAt(params.date, b.endTime);
        return overlaps(cursor, slotEnd, bs, be);
      });

      if (!inBlackout) {
        const slotKeys = new Set(slotKeysForRange(cursor, slotEnd));
        const freeTables = tables.filter((table) => {
          const claimed = claimsByTable.get(String(table._id));
          if (claimed) {
            for (const key of slotKeys) {
              if (claimed.has(key)) return false;
            }
          }
          const conflict = existing.some((r) => {
            const tableMatch = r.tableIds.some((id) => id.equals(table._id));
            return tableMatch && overlaps(cursor, slotEnd, r.slotStart, r.slotEnd);
          });
          return !conflict;
        });

        slots.push({
          time: cursor.toISOString(),
          available: freeTables.length > 0,
          remainingTables: freeTables.length,
        });
      }

      cursor = new Date(cursor.getTime() + interval * 60_000);
    }
  }

  return slots.sort((a, b) => a.time.localeCompare(b.time));
}

export async function findAvailableTable(params: {
  restaurantId: string;
  partySize: number;
  slotStart: Date;
  slotEnd: Date;
}) {
  const tables = await Table.find({
    restaurantId: params.restaurantId,
    active: true,
    minCapacity: { $lte: params.partySize },
    maxCapacity: { $gte: params.partySize },
  });

  const existing = await Reservation.find({
    restaurantId: params.restaurantId,
    status: { $in: ['pending', 'confirmed', 'seated'] },
    slotStart: { $lt: params.slotEnd },
    slotEnd: { $gt: params.slotStart },
  });

  const claimedIds = await findClaimedTableIds({
    restaurantId: params.restaurantId,
    slotStart: params.slotStart,
    slotEnd: params.slotEnd,
  });

  for (const table of tables) {
    if (claimedIds.has(String(table._id))) continue;
    const conflict = existing.some(
      (r) =>
        r.tableIds.some((id) => id.equals(table._id)) &&
        overlaps(params.slotStart, params.slotEnd, r.slotStart, r.slotEnd),
    );
    if (!conflict) return table;
  }
  return null;
}

export async function getTurnTimeMinutes(restaurantId: string, slotStart: Date) {
  const dayOfWeek = slotStart.getDay();
  const hm = `${String(slotStart.getHours()).padStart(2, '0')}:${String(slotStart.getMinutes()).padStart(2, '0')}`;
  const shifts = await Shift.find({
    restaurantId,
    active: true,
    daysOfWeek: dayOfWeek,
  });
  const shift = shifts.find((s) => s.startTime <= hm && hm < s.endTime);
  return shift?.turnTimeMinutes ?? 90;
}
