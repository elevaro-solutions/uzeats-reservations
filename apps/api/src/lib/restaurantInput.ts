import type { RestaurantInput } from '@reservations/shared';

/** Map validated RestaurantInput to Mongoose document fields. */
export function restaurantInputToDb(input: RestaurantInput) {
  const { neighborhood, location, address, ...rest } = input;
  return {
    ...rest,
    address: {
      ...address,
      ...(neighborhood !== undefined ? { neighborhood } : {}),
    },
    location: { type: 'Point' as const, coordinates: [location.lng, location.lat] },
  };
}
