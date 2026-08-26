import { useMutation } from "@apollo/client";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import {
  FAVORITE_RESTAURANT,
  UNFAVORITE_RESTAURANT,
  useAuth,
} from "@/graphql";

export function useToggleFavorite(
  restaurantId: string,
  initialFavorite = false,
) {
  const { user } = useAuth();
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [favoriteRestaurant] = useMutation(FAVORITE_RESTAURANT);
  const [unfavoriteRestaurant] = useMutation(UNFAVORITE_RESTAURANT);

  useEffect(() => {
    setIsFavorite(initialFavorite);
  }, [initialFavorite, restaurantId]);

  const toggleFavorite = useCallback(async () => {
    if (!user) {
      router.push({
        pathname: "/sign-in",
        params: { next: `/restaurant/${restaurantId}` },
      });
      return;
    }

    const next = !isFavorite;
    setIsFavorite(next);

    try {
      if (next) {
        await favoriteRestaurant({ variables: { restaurantId } });
      } else {
        await unfavoriteRestaurant({ variables: { restaurantId } });
      }
    } catch {
      setIsFavorite(!next);
    }
  }, [
    favoriteRestaurant,
    isFavorite,
    restaurantId,
    router,
    unfavoriteRestaurant,
    user,
  ]);

  return { isFavorite, toggleFavorite };
}
