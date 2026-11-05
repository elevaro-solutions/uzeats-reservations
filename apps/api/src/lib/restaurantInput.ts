import {
  canManageOnlineOrdering,
  isValidOnlineOrderUrl,
  normalizeRestaurantCuisines,
  type RestaurantInput,
} from '@reservations/shared';
import { ForbiddenError } from './errors.js';

/** Map validated RestaurantInput to Mongoose document fields. */
export function restaurantInputToDb(input: RestaurantInput) {
  if (input.depositRequired && !(input.depositAmountCents > 0)) {
    throw new Error('Deposit amount must be greater than 0 when a deposit is required');
  }
  const {
    neighborhood,
    location,
    address,
    logoUrl,
    cuisine,
    cuisines,
    onlineOrderEnabled,
    ...rest
  } = input;
  const normalized = normalizeRestaurantCuisines({ cuisine, cuisines });
  return {
    ...rest,
    cuisine: normalized.cuisine,
    cuisines: normalized.cuisines,
    ...(logoUrl !== undefined ? { logoUrl } : {}),
    ...(onlineOrderEnabled != null ? { onlineOrderEnabled } : {}),
    address: {
      ...address,
      ...(neighborhood !== undefined ? { neighborhood } : {}),
    },
    location: { type: 'Point' as const, coordinates: [location.lng, location.lat] },
  };
}

type StoredOnlineOrder = {
  onlineOrderUrl?: string | null;
  onlineOrderEnabled?: boolean | null;
} | null;

/**
 * `onlineOrderEnabled` for a restaurant update:
 * - no valid URL after the update → reset to null, so the next valid URL starts enabled
 * - first valid URL with no explicit flag → enabled
 * - omitted flag otherwise → keep the stored value
 * - changing the flag → owners, managers, and platform admins only
 */
export function resolveOnlineOrderPatch(
  current: StoredOnlineOrder,
  input: Pick<RestaurantInput, 'onlineOrderUrl' | 'onlineOrderEnabled'>,
  role: string,
): { onlineOrderEnabled?: boolean | null } {
  const nextUrl = input.onlineOrderUrl === undefined ? current?.onlineOrderUrl : input.onlineOrderUrl;
  if (!isValidOnlineOrderUrl(nextUrl)) return { onlineOrderEnabled: null };

  const hadUrl = isValidOnlineOrderUrl(current?.onlineOrderUrl);
  const effective = hadUrl ? current?.onlineOrderEnabled !== false : true;
  if (input.onlineOrderEnabled == null) {
    return hadUrl ? {} : { onlineOrderEnabled: true };
  }
  if (input.onlineOrderEnabled !== effective && !canManageOnlineOrdering(role)) {
    throw new ForbiddenError('Only owners, managers, and admins can turn online ordering on or off');
  }
  return { onlineOrderEnabled: input.onlineOrderEnabled };
}
