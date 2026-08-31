import { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Button,
  Empty,
  Flex,
  InlineAlert,
  Skeleton,
} from "@/components";
import { RESTAURANT, useAuth } from "@/graphql";

import { BookFooter } from "./components/book-footer.component";
import { RestaurantActions } from "./components/restaurant-actions.component";
import { RestaurantDetailsPanel } from "./components/restaurant-details-panel.component";
import { RestaurantHero } from "./components/restaurant-hero.component";
import { RestaurantMenuPanel } from "./components/restaurant-menu-panel.component";
import { RestaurantMeta } from "./components/restaurant-meta.component";
import { RestaurantOverlayHeader } from "./components/restaurant-overlay-header.component";
import { RestaurantPhotosPanel } from "./components/restaurant-photos-panel.component";
import { RestaurantReviewsPanel } from "./components/restaurant-reviews-panel.component";
import { RestaurantSectionTabs } from "./components/restaurant-section-tabs.component";
import { buildVisibleTabs } from "./helpers/restaurant-profile.helpers";
import type { ProfileSectionTab, RestaurantQueryData } from "./types";

export function RestaurantProfileFeature() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const [activeTab, setActiveTab] = useState<ProfileSectionTab>("details");

  const { data, loading, error, refetch } = useQuery<RestaurantQueryData>(
    RESTAURANT,
    {
      variables: { id },
      skip: !id,
      fetchPolicy: "cache-and-network",
    },
  );

  const restaurant = data?.restaurant;
  const tabs = restaurant ? buildVisibleTabs(restaurant) : [];

  useEffect(() => {
    if (tabs.length > 0 && !tabs.includes(activeTab)) {
      setActiveTab(tabs[0]!);
    }
  }, [tabs, activeTab]);

  function onBook() {
    if (!user) {
      router.push({
        pathname: "/sign-in",
        params: { next: `/restaurant/${id}` },
      });
      return;
    }
    Alert.alert(
      "Booking coming soon",
      "You’ll be able to reserve a table here in a future update.",
    );
  }

  if (loading && !restaurant) {
    return (
      <Flex flex={1} style={styles.root}>
        <StatusBar style="dark" />
        <Skeleton height={theme.space(40)} radius="lg" />
        <Flex gap={2} style={styles.loadingBody}>
          <Skeleton height={28} width="60%" />
          <Skeleton height={18} width="80%" />
          <Skeleton height={48} />
          <Skeleton height={40} />
          <Skeleton height={120} />
        </Flex>
      </Flex>
    );
  }

  if (error && !restaurant) {
    return (
      <Flex gap={2} style={styles.loadingBody}>
        <StatusBar style="dark" />
        <InlineAlert
          tone="error"
          title="Couldn’t load restaurant"
          message={error.message}
        />
        <Button variant="outlined" color="secondary" onPress={() => refetch()}>
          Try again
        </Button>
      </Flex>
    );
  }

  if (!restaurant) {
    return (
      <Flex flex={1} justifyContent="center" style={styles.loadingBody}>
        <StatusBar style="dark" />
        <Empty
          title="Restaurant not found"
          description="It may have been removed or is no longer listed."
        >
          <Button
            variant="outlined"
            color="secondary"
            onPress={() => router.back()}
          >
            Go back
          </Button>
        </Empty>
      </Flex>
    );
  }

  const footerPad = Math.max(insets.bottom, theme.space(2)) + theme.space(9);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <RestaurantOverlayHeader
        restaurantId={restaurant.id}
        name={restaurant.name}
        slug={restaurant.slug}
        isFavorite={restaurant.isFavorite}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: footerPad }}
        showsVerticalScrollIndicator={false}
      >
        <RestaurantHero
          name={restaurant.name}
          photos={restaurant.photos}
          topInset={insets.top}
        />

        <View style={styles.sheet}>
          <Flex gap={2} style={styles.body}>
            <RestaurantMeta restaurant={restaurant} />
            <RestaurantActions restaurant={restaurant} />
            <RestaurantSectionTabs
              tabs={tabs}
              active={activeTab}
              onChange={setActiveTab}
            />

            <Animated.View
              key={activeTab}
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
            >
              {activeTab === "details" ? (
                <RestaurantDetailsPanel restaurant={restaurant} />
              ) : null}
              {activeTab === "menu" ? (
                <RestaurantMenuPanel restaurant={restaurant} />
              ) : null}
              {activeTab === "reviews" ? (
                <RestaurantReviewsPanel restaurant={restaurant} />
              ) : null}
              {activeTab === "photos" ? (
                <RestaurantPhotosPanel
                  name={restaurant.name}
                  photos={restaurant.photos ?? []}
                />
              ) : null}
            </Animated.View>
          </Flex>
        </View>
      </ScrollView>

      <BookFooter bottomInset={insets.bottom} onBook={onBook} />
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingBody: {
    padding: space(2),
    flex: 1,
    backgroundColor: colors.background,
  },
  sheet: {
    marginTop: -space(2.5),
    backgroundColor: colors.background,
    borderTopLeftRadius: space(3),
    borderTopRightRadius: space(3),
    overflow: "hidden",
  },
  body: {
    paddingHorizontal: space(2),
    paddingTop: space(2.5),
    paddingBottom: space(2),
  },
}));
