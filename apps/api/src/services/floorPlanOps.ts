import { Table } from '../models/Table.js';
import { Reservation } from '../models/Reservation.js';
import { getTurnTimeMinutes } from './availability.js';

export type FloorTableStatus = 'free' | 'reserved' | 'seated' | 'turning';

const RESERVED_WINDOW_MS = 30 * 60_000;
const TURNING_THRESHOLD_MIN = 15;

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

export async function getFloorPlanOps(restaurantId: string, date?: string) {
  const opsDate = date ?? todayDateStr();
  const dayStart = new Date(`${opsDate}T00:00:00`);
  const dayEnd = new Date(`${opsDate}T23:59:59`);
  const now = new Date();

  const [tables, reservations] = await Promise.all([
    Table.find({ restaurantId, active: true }).sort({ name: 1 }),
    Reservation.find({
      restaurantId,
      status: { $in: ['pending', 'confirmed', 'seated'] },
      slotStart: { $lt: dayEnd },
      slotEnd: { $gt: dayStart },
    })
      .populate('dinerId', 'firstName lastName')
      .sort({ slotStart: 1 }),
  ]);

  const tableStates = await Promise.all(
    tables.map(async (table) => {
      const tableId = table._id.toString();
      const seatedRes = reservations.find(
        (r) =>
          r.status === 'seated' &&
          r.tableIds.some((id) => id.toString() === tableId),
      );

      if (seatedRes) {
        const seatedAt = seatedRes.seatedAt ?? seatedRes.slotStart;
        const seatedMinutes = Math.floor((now.getTime() - seatedAt.getTime()) / 60_000);
        const turnTime = await getTurnTimeMinutes(restaurantId, seatedRes.slotStart);
        const turnMinutesRemaining = Math.max(0, turnTime - seatedMinutes);
        const status: FloorTableStatus =
          turnMinutesRemaining <= TURNING_THRESHOLD_MIN ? 'turning' : 'seated';

        return {
          table,
          status,
          reservation: seatedRes,
          seatedMinutes,
          turnMinutesRemaining,
        };
      }

      const upcomingRes = reservations.find((r) => {
        if (!['pending', 'confirmed'].includes(r.status)) return false;
        if (!r.tableIds.some((id) => id.toString() === tableId)) return false;
        const windowStart = new Date(r.slotStart.getTime() - RESERVED_WINDOW_MS);
        return now >= windowStart && now < r.slotEnd;
      });

      if (upcomingRes) {
        return {
          table,
          status: 'reserved' as FloorTableStatus,
          reservation: upcomingRes,
          seatedMinutes: null,
          turnMinutesRemaining: null,
        };
      }

      return {
        table,
        status: 'free' as FloorTableStatus,
        reservation: null,
        seatedMinutes: null,
        turnMinutesRemaining: null,
      };
    }),
  );

  const assignedIds = new Set<string>();
  for (const state of tableStates) {
    if (state.reservation) assignedIds.add(state.reservation._id.toString());
  }

  const unassigned = reservations.filter((r) => {
    if (!['pending', 'confirmed'].includes(r.status)) return false;
    if (assignedIds.has(r._id.toString())) return false;
    const windowStart = new Date(r.slotStart.getTime() - RESERVED_WINDOW_MS);
    return now >= windowStart && now < r.slotEnd;
  });

  return {
    tables: tableStates,
    unassigned,
    date: opsDate,
  };
}

export async function getBookableTables(params: {
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
  }).sort({ name: 1 });

  const existing = await Reservation.find({
    restaurantId: params.restaurantId,
    status: { $in: ['pending', 'confirmed', 'seated'] },
    slotStart: { $lt: params.slotEnd },
    slotEnd: { $gt: params.slotStart },
  });

  const { findClaimedTableIds } = await import('./tableSlotClaims.js');
  const claimedIds = await findClaimedTableIds({
    restaurantId: params.restaurantId,
    slotStart: params.slotStart,
    slotEnd: params.slotEnd,
  });

  return tables.filter((table) => {
    if (claimedIds.has(String(table._id))) return false;
    const conflict = existing.some(
      (r) =>
        r.tableIds.some((id) => id.equals(table._id)) &&
        overlaps(params.slotStart, params.slotEnd, r.slotStart, r.slotEnd),
    );
    return !conflict;
  });
}
