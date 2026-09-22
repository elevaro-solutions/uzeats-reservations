import type { RestaurantInput } from '@reservations/shared';

/** Map validated RestaurantInput to Mongoose document fields. */
export function restaurantInputToDb(input: RestaurantInput) {
  if (input.depositRequired && !(input.depositAmountCents > 0)) {
    throw new Error('Deposit amount must be greater than 0 when a deposit is required');
  }
  const { neighborhood, location, address, logoUrl, ...rest } = input;
  return {
    ...rest,
    ...(logoUrl !== undefined ? { logoUrl } : {}),
    address: {
      ...address,
      ...(neighborhood !== undefined ? { neighborhood } : {}),
    },
    location: { type: 'Point' as const, coordinates: [location.lng, location.lat] },
  };
}
