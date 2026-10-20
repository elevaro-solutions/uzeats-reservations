import { useQuery } from "@apollo/client";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import { Flex } from "@/components";
import {
  buildHomeFeedInput,
  CuisineChipSection,
  DiningStylesGrid,
  LocationPermissionModal,
  LocationSheet,
  SectionHeader,
  useDiscoveryLocation,
  type DiningStyleTile,
  type DiscoveryIndexData,
  type SearchRestaurantsResult,
} from "@/features/discovery";
import { DISCOVERY_INDEX, MY_RESERVATIONS, SEARCH, useAuth } from "@/graphql";
import { useGridColumns } from "@/lib/use-grid-columns";
import { useAppStore } from "@/store";

import { BookingsCarousel } from "./components/bookings-carousel.component";
import { HomeFeedItemView } from "./components/home-feed-item.component";
import { HomeHeader } from "./components/home-header.component";
import {
  HOME_CUISINES_LIMIT,
  HOME_UPCOMING_BOOKINGS_LIMIT,
  homeListLimit,
} from "./home.constants";
import { buildHomeFeedItems } from "./helpers/build-home-feed.helpers";
import { mapUpcomingBookings } from "./helpers/map-upcoming-bookings.helpers";
import {
  buildOpenSearchDiscoveryUpdate,
} from "./helpers/reset-discovery-filters.helpers";
import type { MyReservationsData } from "./types";

export function HomeFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const columns = useGridColumns();
  const listLimit = homeListLimit(columns);
  const { user } = useAuth();
  const discovery = useAppStore((s) => s.discovery);
  const setDiscovery = useAppStore((s) => s.setDiscovery);
  const {
    locationLabel,
    errorMessage,
    openLocationSheet,
    locationSheetProps,
    permissionModalProps,
  } = useDiscoveryLocation();

  const locationInput = useMemo(
    () => ({
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

  const popularInput = useMemo(
    () => buildHomeFeedInput(locationInput, { limit: listLimit }),
    [locationInput, listLimit],
  );

  const topRatedInput = useMemo(
    () =>
      buildHomeFeedInput(locationInput, {
        minRating: 4.5,
        limit: listLimit,
      }),
    [locationInput, listLimit],
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

  const cuisines = (indexData?.discoveryIndex.cuisines ?? []).slice(
    0,
    HOME_CUISINES_LIMIT,
  );
  const cities = indexData?.discoveryIndex.cities ?? [];
  const popular = popularData?.searchRestaurants.items ?? [];
  const topRated = topRatedData?.searchRestaurants.items ?? [];

  const upcomingBookings = useMemo(
    () =>
      mapUpcomingBookings(
        reservationsData?.myReservations ?? [],
        HOME_UPCOMING_BOOKINGS_LIMIT,
      ),
    [reservationsData],
  );

  const openSearch = useCallback(
    (params?: {
      cuisine?: string;
      diningStyle?: DiningStyleTile;
      minRating?: number;
    }) => {
      setDiscovery(buildOpenSearchDiscoveryUpdate(params));
      router.push("/search");
    },
    [router, setDiscovery],
  );

  const handleDiningStyle = useCallback(
    (tile: DiningStyleTile) => {
      if (tile.kind === "more") {
        openSearch();
        return;
      }
      openSearch({ diningStyle: tile });
    },
    [openSearch],
  );

  const feedItems = useMemo(
    () =>
      buildHomeFeedItems(
        [
          {
            key: "popular",
            title: `Popular in ${discovery.nearMe ? locationLabel : discovery.city}`,
            loading: popularLoading,
            error: popularError?.message,
            items: popular,
            limit: listLimit,
          },
          {
            key: "topRated",
            title: "Top rated",
            loading: topRatedLoading,
            error: topRatedError?.message,
            items: topRated,
            limit: listLimit,
          },
        ],
        columns,
      ),
    [
      columns,
      discovery.city,
      discovery.nearMe,
      listLimit,
      locationLabel,
      popular,
      popularError?.message,
      popularLoading,
      topRated,
      topRatedError?.message,
      topRatedLoading,
    ],
  );

  const handleSeeAll = useCallback(
    (key: "popular" | "topRated") => {
      openSearch(key === "topRated" ? { minRating: 4.5 } : undefined);
    },
    [openSearch],
  );

  const listHeader = useMemo(
    () => (
      <Flex gap={4}>
        <HomeHeader
          locationLabel={locationLabel}
          errorMessage={errorMessage}
          onLocationPress={openLocationSheet}
          onSearchPress={() => openSearch()}
        />

        {upcomingBookings.length > 0 ? (
          <Flex gap={1} style={styles.bookingsSection}>
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

        <CuisineChipSection
          title="Cuisines"
          loading={indexLoading}
          cuisines={cuisines}
          onPress={(label) => openSearch({ cuisine: label })}
        />
      </Flex>
    ),
    [
      cuisines,
      errorMessage,
      handleDiningStyle,
      indexLoading,
      locationLabel,
      openLocationSheet,
      openSearch,
      router,
      upcomingBookings,
    ],
  );

  return (
    <>
      <FlashList
        data={feedItems}
        style={styles.list}
        key={`home-${columns}`}
        keyExtractor={(item) => item.id}
        getItemType={(item) => item.type}
        extraData={columns}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 12) + 8 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => (
          <HomeFeedItemView
            item={item}
            columns={columns}
            onSeeAll={handleSeeAll}
          />
        )}
      />

      <LocationSheet {...locationSheetProps} cities={cities} />
      <LocationPermissionModal {...permissionModalProps} />
    </>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: space(5),
    backgroundColor: colors.background,
  },
  bookingsSection: {
    // Tighten against the parent Flex gap before Dining Styles
    marginBottom: -space(1.5),
  },
}));
