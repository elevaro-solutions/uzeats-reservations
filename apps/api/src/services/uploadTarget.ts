import type { IncomingHttpHeaders } from 'node:http';
import {
  isPlatformAdmin,
  parseUploadTarget,
  uploadKeyPrefix,
  type UploadTarget,
} from '@reservations/shared';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import type { UserDocument } from '../models/User.js';

export class UploadTargetError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'UploadTargetError';
    this.status = status;
  }
}

function headerValue(headers: IncomingHttpHeaders, name: string): string {
  const raw = headers[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() ?? '';
}

export function uploadTargetFromHeaders(headers: IncomingHttpHeaders): UploadTarget {
  try {
    return parseUploadTarget({
      scope: headerValue(headers, 'x-upload-scope'),
      kind: headerValue(headers, 'x-upload-kind'),
      restaurantId: headerValue(headers, 'x-upload-restaurant-id'),
    });
  } catch (err) {
    throw new UploadTargetError(400, err instanceof Error ? err.message : 'Invalid upload folder');
  }
}

/**
 * Folder for this upload. Restaurant files require venue access.
 * Review photos are the diner exception: the guest must have a reservation there.
 */
export async function authorizeUploadPrefix(user: UserDocument, target: UploadTarget): Promise<string> {
  if (target.scope === 'account') {
    return uploadKeyPrefix(target, user._id.toString());
  }

  if (target.scope === 'platform') {
    if (!isPlatformAdmin(user.role)) {
      throw new UploadTargetError(403, 'Only platform admins can upload platform files');
    }
    return uploadKeyPrefix(target);
  }

  const restaurant = await Restaurant.findById(target.restaurantId).select('_id ownerId');
  if (!restaurant) {
    throw new UploadTargetError(404, 'Restaurant not found');
  }

  const hasAccess =
    isPlatformAdmin(user.role) ||
    restaurant.ownerId.equals(user._id) ||
    (user.restaurantIds ?? []).some((id) => id.equals(restaurant._id));

  if (hasAccess && user.role !== 'diner') {
    return uploadKeyPrefix(target);
  }

  if (target.kind === 'reviews') {
    const booked = await Reservation.exists({
      restaurantId: target.restaurantId,
      dinerId: user._id,
    });
    if (!booked) {
      throw new UploadTargetError(403, 'You can only add photos for a restaurant you have booked');
    }
    return uploadKeyPrefix(target);
  }

  throw new UploadTargetError(403, 'You cannot upload files for this restaurant');
}
