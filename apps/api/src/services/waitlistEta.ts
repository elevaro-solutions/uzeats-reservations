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
  entry: WaitlistDocument,
  slotTime?: string,
): boolean {
  if (!slotTime) return true;
  if (entry.preferredTimeStart && slotTime < entry.preferredTimeStart) return false;
  if (entry.preferredTimeEnd && slotTime > entry.preferredTimeEnd) return false;
  return true;
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

  const aheadEntries = await WaitlistEntry.find({
    restaurantId: entry.restaurantId,
    preferredDate: entry.preferredDate,
    status: 'waiting',
    createdAt: { $lt: entry.createdAt },
  })
    .sort({ createdAt: 1 })
    .lean();

  const relevantAhead = aheadEntries.filter((e) =>
    partySizeMatches(e.partySize, entry.partySize),
  );

  const position = relevantAhead.length + 1;
  const partiesAhead = relevantAhead.length;

  const activeTables = await Table.countDocuments({
    restaurantId: entry.restaurantId,
    active: true,
    minCapacity: { $lte: entry.partySize },
    maxCapacity: { $gte: entry.partySize },
  });

  const slotStart = new Date(`${entry.preferredDate}T12:00:00`);
  const avgTurnMinutes = await getTurnTimeMinutes(entry.restaurantId.toString(), slotStart);

  let estimatedWaitMinutes = Math.ceil(
    (partiesAhead * avgTurnMinutes) / Math.max(activeTables, 1),
  );

  if (entry.quotedWaitMinutes != null && entry.quotedWaitMinutes > 0) {
    estimatedWaitMinutes = Math.max(estimatedWaitMinutes, entry.quotedWaitMinutes);
  }

  const estimatedReadyAt = new Date(Date.now() + estimatedWaitMinutes * 60_000);

  return {
    position,
    partiesAhead,
    estimatedWaitMinutes,
    estimatedReadyAt,
  };
}

export async function enrichWaitlistEntry(entry: WaitlistDocument) {
  const eta = await computeWaitlistEta(entry);
  return { entry, eta };
}

export async function enrichWaitlistEntries(entries: WaitlistDocument[]) {
  return Promise.all(entries.map((entry) => enrichWaitlistEntry(entry)));
}

export { partySizeMatches, timeWindowMatches };
