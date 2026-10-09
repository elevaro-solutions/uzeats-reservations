import mongoose from 'mongoose';
import { isMongoObjectId } from '@reservations/shared';
import { Restaurant } from '../models/Restaurant.js';
import { User } from '../models/User.js';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const EMPTY_RESERVATION_SEARCH_ID = new mongoose.Types.ObjectId(
  '000000000000000000000000',
);

/** Exact guest-facing confirmation number (6 digits). */
export function isReservationConfirmationLookup(q: string): boolean {
  return /^\d{6}$/.test(q.trim());
}

/**
 * Build `$or` clauses for reservation list search (guest, venue, ids, confirmation #).
 * Returns null when the query is empty.
 */
export async function buildReservationSearchOr(
  raw: string,
  options?: { includeRestaurantName?: boolean },
): Promise<Record<string, unknown>[] | null> {
  const q = raw.trim();
  if (!q) return null;

  const or: Record<string, unknown>[] = [];
  if (isReservationConfirmationLookup(q)) {
    or.push({ confirmationNumber: q });
  }
  if (isMongoObjectId(q)) {
    or.push({ _id: q }, { dinerId: q }, { restaurantId: q });
  }

  const regex = new RegExp(escapeRegex(q), 'i');
  const dinerClauses: Record<string, unknown>[] = [
    { firstName: regex },
    { lastName: regex },
    { email: regex },
    { phone: regex },
  ];
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    dinerClauses.push({
      firstName: new RegExp(escapeRegex(tokens[0]!), 'i'),
      lastName: new RegExp(escapeRegex(tokens.slice(1).join(' ')), 'i'),
    });
  }

  const dinerPromise = User.find({ $or: dinerClauses }).select('_id').limit(100);
  const restaurantPromise =
    options?.includeRestaurantName === false
      ? Promise.resolve([] as Array<{ _id: mongoose.Types.ObjectId }>)
      : Restaurant.find({ name: regex }).select('_id').limit(100);

  const [diners, restaurants] = await Promise.all([dinerPromise, restaurantPromise]);
  if (diners.length) or.push({ dinerId: { $in: diners.map((d) => d._id) } });
  if (restaurants.length) or.push({ restaurantId: { $in: restaurants.map((r) => r._id) } });

  return or;
}
