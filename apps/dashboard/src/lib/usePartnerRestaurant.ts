'use client';

import { useMemo } from 'react';
import {
  buildRestaurantSelectOptions,
  restaurantSelectFilterOption,
  validatedRestaurantId,
} from '@/lib/restaurants';
import { useActiveRestaurant } from '@/lib/useActiveRestaurant';

export type PartnerRestaurant = {
  id: string;
  name: string;
  address?: { city?: string; state?: string };
};

/** Syncs active restaurant with header selector and validates against loaded venues. */
export function usePartnerRestaurant(restaurants: PartnerRestaurant[]) {
  const restaurantIds = useMemo(() => restaurants.map((r) => r.id), [restaurants]);
  const { restaurantId, setRestaurantId } = useActiveRestaurant(restaurantIds);
  const activeRestaurantId = validatedRestaurantId(restaurantId, restaurantIds);
  const restaurantOptions = useMemo(
    () => buildRestaurantSelectOptions(restaurants),
    [restaurants],
  );

  return {
    activeRestaurantId,
    restaurantId: activeRestaurantId,
    setRestaurantId,
    restaurantOptions,
    restaurantIds,
    restaurantSelectProps: {
      value: activeRestaurantId,
      onChange: setRestaurantId,
      options: restaurantOptions,
      showSearch: true as const,
      optionFilterProp: 'label' as const,
      filterOption: restaurantSelectFilterOption,
    },
  };
}
