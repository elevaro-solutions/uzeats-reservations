import { useMutation, useQuery } from "@apollo/client";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { ChevronLeftIcon, HeartIcon } from "@/assets";
import {
  Button,
  Empty,
  Flex,
  IconButton,
  InlineAlert,
  Typography,
} from "@/components";
import { RestaurantCardSkeleton } from "@/components/skeleton";
import {
  RestaurantCard,
  type RestaurantListItem,
} from "@/features/discovery";
import {
  FAVORITE_RESTAURANT,
  MY_SAVED_RESTAURANTS,
  useAuth,
} from "@/graphql";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

type SavedRestaurantsQuery = {
  mySavedRestaurants: RestaurantListItem[];
};

export function FavoritesFeature() {
  const { user, loading: authLoading, sessionOffline, refreshMe } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const [items, setItems] = useState<RestaurantListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingSession, setRetryingSession] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const { data, loading, error, refetch } = useQuery<SavedRestaurantsQuery>(
    MY_SAVED_RESTAURANTS,
    {
      variables: { kind: "favorite" },
      skip: !user,
      fetchPolicy: "cache-and-network",
    },
  );

  const [favoriteRestaurant] = useMutation(FAVORITE_RESTAURANT);

  useEffect(() => {
    if (data?.mySavedRestaurants) {
      setItems(data.mySavedRestaurants);
    }
  }, [data?.mySavedRestaurants]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  const undoUnfavorite = useCallback(
    async (restaurant: RestaurantListItem, index: number) => {
      setItems((prev) => {
        if (prev.some((item) => item.id === restaurant.id)) {
          return prev;
        }
        const next = [...prev];
        const insertAt = Math.min(Math.max(index, 0), next.length);
        next.splice(insertAt, 0, { ...restaurant, isFavorite: true });
        return next;
      });

      try {
        await favoriteRestaurant({
          variables: { restaurantId: restaurant.id },
        });
      } catch (err) {
        setItems((prev) => prev.filter((item) => item.id !== restaurant.id));
        toast.error("Couldn't restore", {
          description: getGraphQLErrorMessage(
            err,
            "Could not add back to favorites",
          ),
        });
      }
    },
    [favoriteRestaurant],
  );

  const handleFavoriteChange = useCallback(
    (restaurant: RestaurantListItem, isFavorite: boolean) => {
      if (isFavorite) return;

      const index = itemsRef.current.findIndex(
        (item) => item.id === restaurant.id,
      );
      if (index < 0) return;

      setItems((prev) => prev.filter((item) => item.id !== restaurant.id));
      toast("Removed from favorites", {
        // Pin icon to top; default is center when there's no description.
        styles: {
          toastContent: { alignItems: "flex-start" },
        },
        action: {
          label: "Undo",
          onClick: () => {
            void undoUnfavorite(restaurant, index);
          },
        },
      });
    },
    [undoUnfavorite],
  );

  const topBar = (
    <Flex direction="row" alignItems="center" style={styles.topBar}>
      <IconButton
        icon={<ChevronLeftIcon />}
        variant="surface"
        size="sm"
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        style={styles.chromeBtn}
      />
      <Typography weight="semibold" size="text-lg" style={styles.topTitle}>
        Favorites
      </Typography>
      <View style={styles.sideSlot} />
    </Flex>
  );

  if (authLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {topBar}
        <Flex gap={2.5} style={styles.listContent}>
          {[1, 2, 3].map((i) => (
            <RestaurantCardSkeleton key={i} />
          ))}
        </Flex>
      </View>
    );
  }

  if (sessionOffline && !user) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {topBar}
        <Flex flex={1} justifyContent="center" style={styles.statePad}>
          <Empty
            title="You're offline"
            description="We couldn't restore your session. Check your connection and try again."
          >
            <Button
              loading={retryingSession}
              onPress={() => {
                setRetryingSession(true);
                void refreshMe().finally(() => setRetryingSession(false));
              }}
            >
              Try again
            </Button>
          </Empty>
        </Flex>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {topBar}
        <Flex flex={1} justifyContent="center" style={styles.statePad}>
          <Empty
            icon={<HeartIcon />}
            title="Sign in to see favorites"
            description="Save restaurants you love and find them here anytime."
          >
            <Button
              onPress={() =>
                router.push({
                  pathname: "/sign-in",
                  params: { next: "/favorites" },
                })
              }
            >
              Sign in
            </Button>
          </Empty>
        </Flex>
      </View>
    );
  }

  const showInitialLoading = loading && items.length === 0 && !error;
  const isEmpty = !loading && !error && items.length === 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {topBar}

      {error && items.length === 0 ? (
        <Flex style={styles.statePad} gap={1.5}>
          <InlineAlert
            tone="error"
            title="Couldn't load favorites"
            message={error.message}
          />
          <Button variant="outlined" onPress={() => void refetch()}>
            Try again
          </Button>
        </Flex>
      ) : showInitialLoading ? (
        <Flex gap={2.5} style={styles.listContent}>
          {[1, 2, 3].map((i) => (
            <RestaurantCardSkeleton key={i} />
          ))}
        </Flex>
      ) : (
        <FlashList
          data={items}
          style={styles.listFlex}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            isEmpty ? styles.listEmpty : null,
            { paddingBottom: Math.max(insets.bottom, theme.space(2)) + theme.space(2) },
          ]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            isEmpty ? (
              <Empty
                icon={<HeartIcon />}
                title="No favorites yet"
                description="Tap the heart on any restaurant to save it here."
                style={styles.empty}
              >
                <Button
                  variant="outlined"
                  color="secondary"
                  onPress={() => router.push("/")}
                >
                  Browse restaurants
                </Button>
              </Empty>
            ) : null
          }
          renderItem={({ item }) => (
            <RestaurantCard
              restaurant={item}
              onFavoriteChange={(isFavorite) =>
                handleFavoriteChange(item, isFavorite)
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
  },
  chromeBtn: {
    width: space(5),
    height: space(5),
    borderRadius: radius.full,
  },
  sideSlot: {
    width: space(5),
    height: space(5),
  },
  listFlex: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: space(2),
    paddingTop: space(1),
  },
  listEmpty: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: space(4),
  },
  separator: {
    height: space(2.5),
  },
  statePad: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
  },
}));
