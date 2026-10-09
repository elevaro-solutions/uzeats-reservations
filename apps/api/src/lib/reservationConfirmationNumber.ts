import crypto from 'node:crypto';
import { Reservation } from '../models/Reservation.js';

/** Guest-facing 6-digit confirmation (`100000`–`999999`). */
export function formatLegacyReservationReference(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9]/g, '');
  const slice = cleaned.slice(-8).toUpperCase();
  return slice || id.toUpperCase();
}

export function resolveReservationConfirmationNumber(
  confirmationNumber: string | null | undefined,
  id: string,
): string {
  const trimmed = confirmationNumber?.trim();
  if (trimmed && /^\d{6}$/.test(trimmed)) return trimmed;
  return formatLegacyReservationReference(id);
}

export async function generateReservationConfirmationNumber(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = String(crypto.randomInt(100000, 1000000));
    const existing = await Reservation.findOne({ confirmationNumber: code }).select('_id');
    if (!existing) return code;
  }
  throw new Error('Could not allocate a unique reservation confirmation number');
}
