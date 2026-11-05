import { Types } from 'mongoose';

/**
 * In-app notifications for one user. With `restaurantId`, keeps that location's alerts
 * plus account-level ones (no `data.restaurantId`), so switching locations never hides
 * agreement or account notices.
 */
export function buildInAppNotificationFilter(
  userId: Types.ObjectId | string,
  opts: { restaurantId?: string | null; unreadOnly?: boolean } = {},
): Record<string, unknown> {
  const clauses: Record<string, unknown>[] = [{ userId, channel: 'in_app' }];
  if (opts.unreadOnly) {
    clauses.push({ $or: [{ readAt: null }, { readAt: { $exists: false } }] });
  }
  if (opts.restaurantId) {
    // `data` is Mixed, so restaurantId may have been saved as a string or an ObjectId.
    const ids: unknown[] = [opts.restaurantId];
    if (Types.ObjectId.isValid(opts.restaurantId)) {
      ids.push(new Types.ObjectId(opts.restaurantId));
    }
    clauses.push({
      $or: [
        { 'data.restaurantId': { $in: ids } },
        // Matches both a null and a missing field.
        { 'data.restaurantId': null },
      ],
    });
  }
  if (clauses.length === 1) return clauses[0]!;
  return { $and: clauses };
}
