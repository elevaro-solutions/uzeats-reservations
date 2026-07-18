import mongoose from 'mongoose';
import { SLOT_QUANTUM_MS, TableSlotClaim } from '../models/TableSlotClaim.js';

export function slotKeysForRange(start: Date, end: Date): string[] {
  const keys: string[] = [];
  let t = Math.floor(start.getTime() / SLOT_QUANTUM_MS) * SLOT_QUANTUM_MS;
  const endMs = end.getTime();
  while (t < endMs) {
    keys.push(new Date(t).toISOString());
    t += SLOT_QUANTUM_MS;
  }
  return keys;
}

export function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  );
}

/** Atomically claim every quantum a reservation occupies. Fails on overlap. */
export async function claimTableSlots(input: {
  restaurantId: string | mongoose.Types.ObjectId;
  tableId: string | mongoose.Types.ObjectId;
  reservationId: string | mongoose.Types.ObjectId;
  slotStart: Date;
  slotEnd: Date;
}) {
  const keys = slotKeysForRange(input.slotStart, input.slotEnd);
  if (keys.length === 0) {
    throw new Error('Invalid reservation time range');
  }

  const docs = keys.map((slotKey) => ({
    restaurantId: input.restaurantId,
    tableId: input.tableId,
    reservationId: input.reservationId,
    slotKey,
  }));

  try {
    await TableSlotClaim.insertMany(docs, { ordered: true });
  } catch (err) {
    await TableSlotClaim.deleteMany({ reservationId: input.reservationId });
    if (isDuplicateKeyError(err)) {
      throw new Error('No tables available for this time');
    }
    throw err;
  }
}

export async function releaseTableSlotClaims(
  reservationId: string | mongoose.Types.ObjectId,
) {
  await TableSlotClaim.deleteMany({ reservationId });
}
