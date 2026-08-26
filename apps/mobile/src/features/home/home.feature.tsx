import { useQuery } from "@apollo/client";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import {
  ChevronDownIcon,
  MapPinIcon,
  SearchIcon,
} from "@/assets";
import {
  Chip,
  Flex,
  InlineAlert,
  Skeleton,
  Typography,
} from "@/components";
import {
  RestaurantCard,
  buildHomeFeedInput,
  useLocationPermission,
  type DiscoveryIndexData,
  type RestaurantListItem,
  type SearchRestaurantsResult,
} from "@/features/discovery";
import {
  DISCOVERY_INDEX,
  MY_RESERVATIONS,
  SEARCH,
  useAuth,
} from "@/graphql";
import { useAppStore } from "@/store";

import { BookingsCarousel } from "./components/bookings-carousel.component";
import { DiningStylesGrid } from "./components/dining-styles-grid.component";
import { LocationSheet } from "./components/location-sheet.component";
import { SectionHeader } from "./components/section-header.component";
import type { DiningStyleTile } from "./data/dining-styles";

const HOME_LIST_LIMIT = 4;

type MyReservationsData = {
  myReservations: Array<{
    id: string;
    status: string;
    slotStart: string;
    partySize: number;
    restaurant: {
      id: string;
      name: string;
      photos: string[];
    };
  }>;
};

function formatSlotLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function splitCuisineRows<T>(items: T[]): [T[], T[]] {
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)];
}

export function HomeFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { user } = useAuth();
  const discovery = useAppStore((s) => s.discovery);
  const setDiscovery = useAppStore((s) => s.setDiscovery);
  const { useCurrentLocation, status: locationStatus, errorMessage } =
    useLocationPermission();
  const [locationOpen, setLocationOpen] = useState(false);

  const locationLabel = discovery.nearMe
    ? (discovery.locationLabel ?? "Near you")
    : discovery.city;

  // Home feed depends only on location — never search-screen filters.
  const popularInput = useMemo(
    () =>
      buildHomeFeedInput({
        city: discovery.city,
        state: discovery.state,
        nearMe: discovery.nearMe,
        lat: discovery.lat,
        lng: discovery.lng,
        radiusKm: discovery.radiusKm,
      }),
    [
      discovery.city,
      discovery.state,
      discovery.nearMe,
      discovery.lat,
      discovery.lng,
      discovery.radiusKm,
    ],
  );

  const topRatedInput = useMemo(
    () =>
      buildHomeFeedInput(
        {
          city: discovery.city,
          state: discovery.state,
          nearMe: discovery.nearMe,
          lat: discovery.lat,
          lng: discovery.lng,
          radiusKm: discovery.radiusKm,
        },
        { minRating: 4.5 },
      ),
    [
      discovery.city,
      discovery.state,
      discovery.nearMe,
      discovery.lat,
      discovery.lng,
      discovery.radiusKm,
    ],
  );

  const { data: indexData, loading: indexLoading } = useQuery<{
    discoveryIndex: DiscoveryIndexData;
  }>(DISCOVERY_INDEX, {
    fetchPolicy: "cache-and-network",
  });

  const {
    data: popularData,
    loading: popularLoading,
    error: popularError,
  } = useQuery<{ searchRestaurants: SearchRestaurantsResult }>(SEARCH, {
    variables: { input: popularInput },
    fetchPolicy: "cache-and-network",
  });

  const {
    data: topRatedData,
    loading: topRatedLoading,
    error: topRatedError,
  } = useQuery<{ searchRestaurants: SearchRestaurantsResult }>(SEARCH, {
    variables: { input: topRatedInput },
    fetchPolicy: "cache-and-network",
  });

  const { data: reservationsData } = useQuery<MyReservationsData>(
    MY_RESERVATIONS,
    {
      skip: !user,
      fetchPolicy: "cache-and-network",
    },
  );

  const cuisines = (indexData?.discoveryIndex.cuisines ?? []).slice(0, 12);
  const [cuisineRow1, cuisineRow2] = splitCuisineRows(cuisines);
  const cities = indexData?.discoveryIndex.cities ?? [];
  const popular = popularData?.searchRestaurants.items ?? [];
  const topRated = topRatedData?.searchRestaurants.items ?? [];

  const upcomingBookings = useMemo(() => {
    const list = reservationsData?.myReservations ?? [];
    const now = Date.now();
    return list
      .filter((r) => {
        if (r.status === "cancelled" || r.status === "no_show") return false;
        const t = new Date(r.slotStart).getTime();
        return Number.isFinite(t) && t >= now - 60 * 60 * 1000;
      })
      .slice(0, 8)
      .map((r) => ({
        id: r.id,
        restaurantId: r.restaurant.id,
        restaurantName: r.restaurant.name,
        photo: r.restaurant.photos?.[0],
        whenLabel: formatSlotLabel(r.slotStart),
        partySize: r.partySize,
      }));
  }, [reservationsData]);

  function openSearch(params?: {
    cuisine?: string;
    diningStyle?: DiningStyleTile;
  }) {
    if (params?.diningStyle) {
      setDiscovery({
        query: "",
        cuisine: undefined,
        diningStyles: undefined,
        occasions: undefined,
        meals: undefined,
        amenities: undefined,
        minRating: undefined,
        ...params.diningStyle.filter,
      });
    } else if (params?.cuisine) {
      setDiscovery({
        cuisine: params.cuisine,
        query: "",
        diningStyles: undefined,
        occasions: undefined,
        meals: undefined,
        amenities: undefined,
        minRating: undefined,
      });
    }
    router.push("/search");
  }

  function handleDiningStyle(tile: DiningStyleTile) {
    if (tile.kind === "more") {
      setDiscovery({
        diningStyles: undefined,
        occasions: undefined,
        meals: undefined,
        amenities: undefined,
      });
      openSearch();
      return;
    }
    openSearch({ diningStyle: tile });
  }

  async function handleUseLocation() {
    const ok = await useCurrentLocation();
    if (ok) setLocationOpen(false);
  }

  function handleSelectCity(city: string, state?: string | null) {
    setDiscovery({
      city,
      state: state ?? undefined,
      nearMe: false,
      lat: undefined,
      lng: undefined,
      locationLabel: undefined,
    });
    setLocationOpen(false);
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 12) + 8 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Flex gap={4}>
          <Flex gap={2.5} style={styles.padX}>
            <Pressable
              onPress={() => setLocationOpen(true)}
              style={styles.locationRow}
              accessibilityRole="button"
              accessibilityLabel="Change location"
            >
              <MapPinIcon size={18} color={theme.colors.primary} />
              <Typography weight="semibold" numberOfLines={1} style={styles.locationLabel}>
                {locationLabel}
              </Typography>
              <ChevronDownIcon size={16} color={theme.colors.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => openSearch()}
              style={styles.searchAffordance}
              accessibilityRole="button"
              accessibilityLabel="Search restaurants"
            >
              <SearchIcon size={18} color={theme.colors.textPrimary} />
              <Typography
                weight="medium"
                size="text-md"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={styles.searchPlaceholder}
              >
                Search restaurants…
              </Typography>
            </Pressable>
          </Flex>

          {errorMessage ? (
            <View style={styles.padX}>
              <InlineAlert
                tone="warning"
                title="Location unavailable"
                message={errorMessage}
              />
            </View>
          ) : null}

          {upcomingBookings.length > 0 ? (
            <Flex gap={1.5}>
              <SectionHeader
                title="My bookings"
                onActionPress={() => router.push("/reservations")}
              />
              <BookingsCarousel items={upcomingBookings} />
            </Flex>
          ) : null}

          <Flex gap={1.5}>
            <SectionHeader title="Dining Styles" />
            <DiningStylesGrid onSelect={handleDiningStyle} />
          </Flex>

          <Flex gap={1.5}>
            <SectionHeader title="Cuisines" />
            {indexLoading && cuisines.length === 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipScroll}
              >
                <Flex gap={1}>
                  <Flex direction="row" gap={1}>
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} width={88} height={36} radius="full" />
                    ))}
                  </Flex>
                  <Flex direction="row" gap={1}>
                    {[4, 5, 6].map((i) => (
                      <Skeleton key={i} width={88} height={36} radius="full" />
                    ))}
                  </Flex>
                </Flex>
              </ScrollView>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipScroll}
              >
                <Flex gap={1}>
                  <Flex direction="row" gap={1}>
                    {cuisineRow1.map((c) => (
                      <Chip
                        key={c.slug}
                        onPress={() => openSearch({ cuisine: c.label })}
                      >
                        {c.label}
                      </Chip>
                    ))}
                  </Flex>
                  {cuisineRow2.length > 0 ? (
                    <Flex direction="row" gap={1}>
                      {cuisineRow2.map((c) => (
                        <Chip
                          key={c.slug}
                          onPress={() => openSearch({ cuisine: c.label })}
                        >
                          {c.label}
                        </Chip>
                      ))}
                    </Flex>
                  ) : null}
                </Flex>
              </ScrollView>
            )}
          </Flex>

          <HomeRestaurantSection
            title={`Popular in ${discovery.nearMe ? locationLabel : discovery.city}`}
            loading={popularLoading}
            error={popularError?.message}
            items={popular}
            onSeeAll={() => openSearch()}
          />

          <HomeRestaurantSection
            title="Top rated"
            loading={topRatedLoading}
            error={topRatedError?.message}
            items={topRated}
            onSeeAll={() => {
              setDiscovery({ minRating: 4.5 });
              openSearch();
            }}
          />
        </Flex>
      </ScrollView>

      <LocationSheet
        visible={locationOpen}
        cities={cities}
        currentLabel={locationLabel}
        nearMeLoading={locationStatus === "requesting"}
        onClose={() => setLocationOpen(false)}
        onSelectCity={handleSelectCity}
        onUseCurrentLocation={handleUseLocation}
      />
    </>
  );
}

function HomeRestaurantSection({
  title,
  loading,
  error,
  items,
  onSeeAll,
}: {
  title: string;
  loading: boolean;
  error?: string;
  items: RestaurantListItem[];
  onSeeAll: () => void;
}) {
  const visible = items.slice(0, HOME_LIST_LIMIT);

  return (
    <Flex gap={2.5}>
      <SectionHeader title={title} onActionPress={onSeeAll} />
      {error ? (
        <View style={styles.padX}>
          <InlineAlert tone="error" title="Couldn’t load" message={error} />
        </View>
      ) : null}
      {loading && items.length === 0 ? (
        <Flex gap={2.5} style={styles.padX}>
          {[1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={240} radius="lg" />
          ))}
        </Flex>
      ) : items.length === 0 ? (
        <View style={styles.padX}>
          <Typography size="text-sm" color="secondary">
            No restaurants found for this area yet.
          </Typography>
        </View>
      ) : (
        <Flex gap={2.5} style={styles.padX}>
          {visible.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              variant="list"
            />
          ))}
        </Flex>
      )}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  content: {
    paddingBottom: space(5),
    backgroundColor: colors.background,
  },
  padX: {
    paddingHorizontal: space(2),
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1),
  },
  locationLabel: {
    flexShrink: 1,
  },
  searchAffordance: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1),
    minHeight: 52,
    paddingHorizontal: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  searchPlaceholder: {
    flex: 1,
  },
  chipScroll: {
    paddingHorizontal: space(2),
  },
}));
