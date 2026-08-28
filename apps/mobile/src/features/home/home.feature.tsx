import { useQuery } from "@apollo/client";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView } from "react-native";
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
import { useAppStore } from "@/store";

import { BookingsCarousel } from "./components/bookings-carousel.component";
import { HomeHeader } from "./components/home-header.component";
import { HomeRestaurantSection } from "./components/home-restaurant-section.component";
import {
  HOME_CUISINES_LIMIT,
  HOME_UPCOMING_BOOKINGS_LIMIT,
} from "./home.constants";
import { mapUpcomingBookings } from "./helpers/map-upcoming-bookings.helpers";
import {
  buildOpenSearchDiscoveryUpdate,
} from "./helpers/reset-discovery-filters.helpers";
import type { MyReservationsData } from "./types";

export function HomeFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    () => buildHomeFeedInput(locationInput),
    [locationInput],
  );

  const topRatedInput = useMemo(
    () => buildHomeFeedInput(locationInput, { minRating: 4.5 }),
    [locationInput],
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

  function openSearch(params?: {
    cuisine?: string;
    diningStyle?: DiningStyleTile;
    minRating?: number;
  }) {
    setDiscovery(buildOpenSearchDiscoveryUpdate(params));
    router.push("/search");
  }

  function handleDiningStyle(tile: DiningStyleTile) {
    if (tile.kind === "more") {
      openSearch();
      return;
    }
    openSearch({ diningStyle: tile });
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
          <HomeHeader
            locationLabel={locationLabel}
            errorMessage={errorMessage}
            onLocationPress={openLocationSheet}
            onSearchPress={() => openSearch()}
          />

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

          <CuisineChipSection
            title="Cuisines"
            loading={indexLoading}
            cuisines={cuisines}
            onPress={(label) => openSearch({ cuisine: label })}
          />

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
            onSeeAll={() => openSearch({ minRating: 4.5 })}
          />
        </Flex>
      </ScrollView>

      <LocationSheet {...locationSheetProps} cities={cities} />
      <LocationPermissionModal {...permissionModalProps} />
    </>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  content: {
    paddingBottom: space(5),
    backgroundColor: colors.background,
  },
}));
