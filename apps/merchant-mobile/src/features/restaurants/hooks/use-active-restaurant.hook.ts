import { useQuery } from "@apollo/client";
import { useEffect, useMemo } from "react";

import { useAuth } from "@/graphql";
import { useAppStore } from "@/store";

import { MY_RESTAURANTS } from "../api/restaurants.operations";

export type PartnerRestaurant = {
  id: string;
  name: string;
  status?: string | null;
  cuisine?: string | null;
  phone?: string | null;
  timezone?: string | null;
  address?: {
    line1?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
  tables?: Array<{
    id: string;
    name: string;
    minCapacity: number;
    maxCapacity: number;
    floorArea?: string | null;
    active?: boolean | null;
  }> | null;
  shifts?: Array<{
    id: string;
    name: string;
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    active?: boolean | null;
  }> | null;
};

type MyRestaurantsQuery = {
  myRestaurants: PartnerRestaurant[];
};

export function useActiveRestaurant() {
  const { user } = useAuth();
  const activeRestaurantId = useAppStore((s) => s.activeRestaurantId);
  const setActiveRestaurantId = useAppStore((s) => s.setActiveRestaurantId);

  const { data, loading, error, refetch } = useQuery<MyRestaurantsQuery>(
    MY_RESTAURANTS,
    {
      skip: !user,
      fetchPolicy: "cache-and-network",
    },
  );

  const restaurants = data?.myRestaurants ?? [];
  /** True once the partner restaurants query has settled (success or empty). */
  const restaurantsReady = Boolean(user) && !loading;

  useEffect(() => {
    if (!restaurantsReady || error) return;

    if (restaurants.length === 0) {
      if (activeRestaurantId) setActiveRestaurantId(null);
      return;
    }

    const ids = restaurants.map((r) => r.id);
    if (activeRestaurantId && ids.includes(activeRestaurantId)) return;

    // Drop stale/invalid persisted IDs (CastError on findById) and pick the first venue.
    setActiveRestaurantId(restaurants[0]?.id ?? null);
  }, [
    restaurantsReady,
    error,
    restaurants,
    activeRestaurantId,
    setActiveRestaurantId,
  ]);

  const activeRestaurant = useMemo(
    () => restaurants.find((r) => r.id === activeRestaurantId) ?? null,
    [restaurants, activeRestaurantId],
  );

  return {
    restaurants,
    /** Persisted id — may be stale until `restaurantsReady` + effect reconcile. */
    activeRestaurantId,
    /** Confirmed restaurant from `myRestaurants` — safe for ops queries. */
    activeRestaurant,
    setActiveRestaurantId,
    loading,
    error,
    refetch,
    restaurantsReady,
  };
}
