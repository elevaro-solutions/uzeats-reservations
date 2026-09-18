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

  useEffect(() => {
    if (restaurants.length === 0) return;

    const ids = restaurants.map((r) => r.id);
    if (activeRestaurantId && ids.includes(activeRestaurantId)) return;

    setActiveRestaurantId(restaurants[0]?.id ?? null);
  }, [restaurants, activeRestaurantId, setActiveRestaurantId]);

  const activeRestaurant = useMemo(
    () => restaurants.find((r) => r.id === activeRestaurantId) ?? null,
    [restaurants, activeRestaurantId],
  );

  return {
    restaurants,
    activeRestaurantId,
    activeRestaurant,
    setActiveRestaurantId,
    loading,
    error,
    refetch,
  };
}
