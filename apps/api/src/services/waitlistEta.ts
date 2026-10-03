import { WaitlistEntry, type WaitlistDocument } from '../models/Waitlist.js';
import { Table } from '../models/Table.js';
import { getTurnTimeMinutes } from './availability.js';

export type WaitlistEta = {
  position: number | null;
  partiesAhead: number;
  estimatedWaitMinutes: number | null;
  estimatedReadyAt: Date | null;
};

function partySizeMatches(waitParty: number, targetParty: number) {
  return waitParty <= targetParty + 2 && waitParty >= Math.max(1, targetParty - 2);
}

function timeWindowMatches(
  entry: Pick<WaitlistDocument, 'preferredTimeStart' | 'preferredTimeEnd'>,
  slotTime?: string,
): boolean {
  if (!slotTime) return true;
  if (entry.preferredTimeStart && slotTime < entry.preferredTimeStart) return false;
  if (entry.preferredTimeEnd && slotTime > entry.preferredTimeEnd) return false;
  return true;
}

type QueueEntry = {
  partySize: number;
  createdAt: Date;
  quotedWaitMinutes?: number | null;
};

function estimateFromQueue(
  entry: QueueEntry,
  ahead: QueueEntry[],
  activeTables: number,
  avgTurnMinutes: number,
  now: Date,
): WaitlistEta {
  const relevantAhead = ahead.filter((e) => partySizeMatches(e.partySize, entry.partySize));
  const partiesAhead = relevantAhead.length;
  let estimatedWaitMinutes = Math.ceil(
    (partiesAhead * avgTurnMinutes) / Math.max(activeTables, 1),
  );
  if (entry.quotedWaitMinutes != null && entry.quotedWaitMinutes > 0) {
    estimatedWaitMinutes = Math.max(estimatedWaitMinutes, entry.quotedWaitMinutes);
  }
  return {
    position: partiesAhead + 1,
    partiesAhead,
    estimatedWaitMinutes,
    estimatedReadyAt: new Date(now.getTime() + estimatedWaitMinutes * 60_000),
  };
}

async function countFittingTables(restaurantId: string, partySize: number) {
  return Table.countDocuments({
    restaurantId,
    active: true,
    minCapacity: { $lte: partySize },
    maxCapacity: { $gte: partySize },
  });
}

export async function computeWaitlistEta(entry: WaitlistDocument): Promise<WaitlistEta> {
  if (entry.status !== 'waiting') {
    return {
      position: null,
      partiesAhead: 0,
      estimatedWaitMinutes: null,
      estimatedReadyAt: null,
    };
  }

  const restaurantId = entry.restaurantId.toString();
  const aheadEntries = await WaitlistEntry.find({
    restaurantId: entry.restaurantId,
    preferredDate: entry.preferredDate,
    status: 'waiting',
    createdAt: { $lt: entry.createdAt },
  })
    .sort({ createdAt: 1 })
    .lean();

  const slotStart = new Date(`${entry.preferredDate}T12:00:00`);
  const [avgTurnMinutes, activeTables] = await Promise.all([
    getTurnTimeMinutes(restaurantId, slotStart),
    countFittingTables(restaurantId, entry.partySize),
  ]);

  return estimateFromQueue(
    {
      partySize: entry.partySize,
      createdAt: entry.createdAt as Date,
      quotedWaitMinutes: entry.quotedWaitMinutes,
    },
    aheadEntries as QueueEntry[],
    activeTables,
    avgTurnMinutes,
    new Date(),
  );
}

export async function enrichWaitlistEntry(entry: WaitlistDocument) {
  const eta = await computeWaitlistEta(entry);
  return { entry, eta };
}

/**
 * Batch ETA enrichment: one waiting-queue query + turn-time lookup per
 * restaurant/date group, shared table-count cache.
 */
export async function enrichWaitlistEntries(entries: WaitlistDocument[]) {
  if (entries.length === 0) return [];

  const now = new Date();
  const emptyEta: WaitlistEta = {
    position: null,
    partiesAhead: 0,
    estimatedWaitMinutes: null,
    estimatedReadyAt: null,
  };

  const waiting = entries.filter((e) => e.status === 'waiting');
  if (waiting.length === 0) {
    return entries.map((entry) => ({ entry, eta: emptyEta }));
  }

  const groups = new Map<
    string,
    { restaurantId: string; preferredDate: string; entries: WaitlistDocument[] }
  >();

  for (const entry of waiting) {
    const restaurantId = entry.restaurantId.toString();
    const key = `${restaurantId}|${entry.preferredDate}`;
    const group = groups.get(key);
    if (group) group.entries.push(entry);
    else {
      groups.set(key, {
        restaurantId,
        preferredDate: entry.preferredDate,
        entries: [entry],
      });
    }
  }

  const etaById = new Map<string, WaitlistEta>();

  await Promise.all(
    [...groups.values()].map(async (group) => {
      const queue = (await WaitlistEntry.find({
        restaurantId: group.restaurantId,
        preferredDate: group.preferredDate,
        status: 'waiting',
      })
        .sort({ createdAt: 1 })
        .select('partySize createdAt quotedWaitMinutes')
        .lean()) as QueueEntry[];

      const slotStart = new Date(`${group.preferredDate}T12:00:00`);
      const avgTurnMinutes = await getTurnTimeMinutes(group.restaurantId, slotStart);
      const tableCountByParty = new Map<number, number>();
      const partySizes = [...new Set(group.entries.map((e) => e.partySize))];
      await Promise.all(
        partySizes.map(async (partySize) => {
          tableCountByParty.set(
            partySize,
            await countFittingTables(group.restaurantId, partySize),
          );
        }),
      );

      for (const entry of group.entries) {
        const createdAtMs = new Date(entry.createdAt as Date).getTime();
        const ahead = queue.filter((e) => new Date(e.createdAt).getTime() < createdAtMs);
        etaById.set(
          entry._id.toString(),
          estimateFromQueue(
            {
              partySize: entry.partySize,
              createdAt: entry.createdAt as Date,
              quotedWaitMinutes: entry.quotedWaitMinutes,
            },
            ahead,
            tableCountByParty.get(entry.partySize) ?? 1,
            avgTurnMinutes,
            now,
          ),
        );
      }
    }),
  );

  return entries.map((entry) => ({
    entry,
    eta: entry.status === 'waiting' ? (etaById.get(entry._id.toString()) ?? emptyEta) : emptyEta,
  }));
}

export { partySizeMatches, timeWindowMatches };
