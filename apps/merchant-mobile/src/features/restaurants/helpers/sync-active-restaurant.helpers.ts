import { toast } from "sonner-native";

import { apolloClient } from "@/graphql/client";
import { useAppStore } from "@/store";

import { MY_RESTAURANTS } from "../api/restaurants.operations";

type RestaurantRef = { id: string; name: string };

function restaurantsFromCache(): RestaurantRef[] {
  try {
    const data = apolloClient.readQuery<{ myRestaurants: RestaurantRef[] }>({
      query: MY_RESTAURANTS,
    });
    return data?.myRestaurants ?? [];
  } catch {
    return [];
  }
}

export type SyncActiveRestaurantOptions = {
  /** Prefer passing the live list from `useActiveRestaurant`; falls back to Apollo cache. */
  restaurants?: RestaurantRef[];
};

/**
 * Align MMKV `activeRestaurantId` with a deep-linked venue (notification / thread).
 * Toasts only when the partner has multiple venues and the id actually changes.
 */
export function syncActiveRestaurantId(
  restaurantId: string | null | undefined,
  options?: SyncActiveRestaurantOptions,
): boolean {
  if (!restaurantId) return false;

  const { activeRestaurantId, setActiveRestaurantId } = useAppStore.getState();
  if (restaurantId === activeRestaurantId) return false;

  const restaurants = options?.restaurants ?? restaurantsFromCache();
  setActiveRestaurantId(restaurantId);

  if (restaurants.length > 1) {
    const name = restaurants.find((r) => r.id === restaurantId)?.name;
    toast.info(name ? `Switched to ${name}` : "Switched restaurant");
  }

  return true;
}
