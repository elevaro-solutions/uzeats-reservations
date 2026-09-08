import { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Flex } from "@/components";
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
import {
  RestaurantProfileError,
  RestaurantProfileLoading,
  RestaurantProfileNotFound,
} from "./components/restaurant-profile-states.component";
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
    if (!id) return;

    if (!user) {
      router.push({
        pathname: "/sign-in",
        params: { next: `/restaurant/${id}/book` },
      });
      return;
    }

    if (
      restaurant?.reservationsVisible === false ||
      restaurant?.reservationsEnabled === false
    ) {
      Alert.alert(
        "Contact to reserve",
        "This restaurant does not accept online reservations.",
      );
      return;
    }

    router.push({
      pathname: "/restaurant/[id]/book",
      params: { id },
    });
  }

  if (loading && !restaurant) {
    return <RestaurantProfileLoading />;
  }

  if (error && !restaurant) {
    return (
      <RestaurantProfileError
        message={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  if (!restaurant) {
    return <RestaurantProfileNotFound />;
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
