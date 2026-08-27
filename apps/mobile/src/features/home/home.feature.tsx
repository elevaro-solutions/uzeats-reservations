import { useQuery } from "@apollo/client";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import { Flex } from "@/components";
import {
  buildHomeFeedInput,
  useLocationPermission,
  type AddressSelection,
  type DiscoveryIndexData,
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
import { CuisinesSection } from "./components/cuisines-section.component";
import { DiningStylesGrid } from "./components/dining-styles-grid.component";
import { HomeHeader } from "./components/home-header.component";
import { HomeRestaurantSection } from "./components/home-restaurant-section.component";
import { LocationPermissionModal } from "./components/location-permission-modal.component";
import { LocationSheet } from "./components/location-sheet.component";
import { SectionHeader } from "./components/section-header.component";
import type { DiningStyleTile } from "./data/dining-styles";
import {
  HOME_CUISINES_LIMIT,
  HOME_UPCOMING_BOOKINGS_LIMIT,
} from "./home.constants";
import { mapUpcomingBookings } from "./helpers/map-upcoming-bookings.helpers";
import type { MyReservationsData } from "./types";

export function HomeFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const discovery = useAppStore((s) => s.discovery);
  const setDiscovery = useAppStore((s) => s.setDiscovery);
  const {
    useCurrentLocation,
    getPermission,
    status: locationStatus,
    errorMessage,
    clearError,
    openAppSettings,
  } = useLocationPermission();
  const [locationOpen, setLocationOpen] = useState(false);
  const [permissionOpen, setPermissionOpen] = useState(false);

  const locationLabel = discovery.nearMe
    ? (discovery.locationLabel ?? "Near you")
    : discovery.city;

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
  }) {
    if (params?.diningStyle) {
      setDiscovery({
        query: "",
        cuisine: undefined,
        diningStyles: undefined,
        occasions: undefined,
        meals: undefined,
        dietaryTags: undefined,
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
        dietaryTags: undefined,
        amenities: undefined,
        minRating: undefined,
      });
    } else {
      setDiscovery({
        query: "",
        cuisine: undefined,
        diningStyles: undefined,
        occasions: undefined,
        meals: undefined,
        dietaryTags: undefined,
        amenities: undefined,
        minRating: undefined,
        priceRange: undefined,
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
        dietaryTags: undefined,
        amenities: undefined,
      });
      openSearch();
      return;
    }
    openSearch({ diningStyle: tile });
  }

  async function handleUseLocation() {
    clearError();
    const result = await useCurrentLocation();
    if (result.ok) {
      setLocationOpen(false);
      return;
    }
    if (result.needsSettings) {
      Alert.alert(
        "Enable location",
        "Turn on location access for Tablevera in Settings to see restaurants near you.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => void openAppSettings() },
        ],
      );
    }
  }

  /** Soft-ask only when the system prompt can still appear; otherwise request directly. */
  async function handleNearMePress() {
    clearError();
    const existing = await getPermission();
    if (existing.status === "granted") {
      await handleUseLocation();
      return;
    }
    if (existing.status === "denied" && existing.canAskAgain === false) {
      await handleUseLocation();
      return;
    }
    setPermissionOpen(true);
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

  function handleSelectPlace(place: AddressSelection) {
    setDiscovery({
      nearMe: true,
      lat: place.lat,
      lng: place.lng,
      locationLabel: place.label,
      city: place.city ?? place.label,
      state: place.state,
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
          <HomeHeader
            locationLabel={locationLabel}
            errorMessage={errorMessage}
            onLocationPress={() => setLocationOpen(true)}
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

          <CuisinesSection
            loading={indexLoading}
            cuisines={cuisines}
            onCuisinePress={(label) => openSearch({ cuisine: label })}
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
        highlightCitySelection={!discovery.nearMe}
        nearMeLoading={locationStatus === "requesting"}
        onClose={() => setLocationOpen(false)}
        onSelectCity={handleSelectCity}
        onSelectPlace={handleSelectPlace}
        onUseCurrentLocation={() => {
          void handleNearMePress();
        }}
      />

      <LocationPermissionModal
        visible={permissionOpen}
        loading={locationStatus === "requesting"}
        onClose={() => setPermissionOpen(false)}
        onAllow={() => {
          setPermissionOpen(false);
          void handleUseLocation();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  content: {
    paddingBottom: space(5),
    backgroundColor: colors.background,
  },
}));
