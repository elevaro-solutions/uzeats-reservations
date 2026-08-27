import { useQuery } from "@apollo/client";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { Alert, ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MapPinIcon, StarIcon } from "@/assets";
import {
  Button,
  Empty,
  Flex,
  InlineAlert,
  Skeleton,
  Typography,
} from "@/components";
import {
  formatFullAddress,
  formatPriceRange,
  formatShortHours,
} from "@/features/discovery";
import { RESTAURANT, useAuth } from "@/graphql";

import { BookFooter } from "./components/book-footer.component";
import { RestaurantAbout } from "./components/restaurant-about.component";
import { RestaurantHero } from "./components/restaurant-hero.component";
import type { RestaurantQueryData } from "./types";

function spacePad(n: number): number {
  return n > 0 ? n : 24;
}

export function RestaurantProfileFeature() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  const { data, loading, error, refetch } = useQuery<RestaurantQueryData>(
    RESTAURANT,
    {
      variables: { id },
      skip: !id,
      fetchPolicy: "cache-and-network",
    },
  );

  const restaurant = data?.restaurant;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: restaurant?.name ?? "Restaurant",
    });
  }, [navigation, restaurant?.name]);

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
      <Flex gap={2} style={styles.loading}>
        <Skeleton height={240} radius="lg" />
        <Skeleton height={28} width="60%" />
        <Skeleton height={18} width="80%" />
        <Skeleton height={80} />
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex gap={2} style={styles.loading}>
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
      <Flex flex={1} justifyContent="center" style={styles.loading}>
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

  const hours = formatShortHours(restaurant.shifts);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: spacePad(insets.bottom) + 88 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <RestaurantHero name={restaurant.name} photo={restaurant.photos?.[0]} />

        <Flex gap={2} style={styles.body}>
          {restaurant.featured ? (
            <Typography
              size="text-xs"
              weight="medium"
              color="primary"
              style={styles.badge}
            >
              Featured
            </Typography>
          ) : null}

          <Flex
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            gap={1}
          >
            <Typography size="display-xs" weight="bold" style={styles.name}>
              {restaurant.name}
            </Typography>
            <Flex direction="row" alignItems="center" gap={0.5}>
              <StarIcon size={16} color={theme.colors.accent} />
              <Typography weight="semibold">
                {restaurant.averageRating > 0
                  ? restaurant.averageRating.toFixed(1)
                  : "New"}
              </Typography>
              {restaurant.reviewCount > 0 ? (
                <Typography size="text-sm" color="secondary">
                  ({restaurant.reviewCount})
                </Typography>
              ) : null}
            </Flex>
          </Flex>

          <Typography color="secondary">
            {restaurant.cuisine}
            {" · "}
            {formatPriceRange(restaurant.priceRange)}
          </Typography>

          <Flex direction="row" alignItems="flex-start" gap={1}>
            <MapPinIcon size={18} color={theme.colors.primary} />
            <Typography size="text-sm" color="secondary" style={styles.flex1}>
              {formatFullAddress(restaurant.address)}
            </Typography>
          </Flex>

          {hours ? (
            <Flex style={styles.hoursBox}>
              <Typography size="text-sm">Hours: {hours}</Typography>
            </Flex>
          ) : null}

          {restaurant.description ? (
            <RestaurantAbout description={restaurant.description} />
          ) : null}

          {restaurant.amenities && restaurant.amenities.length > 0 ? (
            <Flex gap={1}>
              <Typography weight="semibold" size="text-lg">
                Amenities
              </Typography>
              <Typography size="text-sm" color="secondary">
                {restaurant.amenities.join(" · ")}
              </Typography>
            </Flex>
          ) : null}
        </Flex>
      </ScrollView>

      <BookFooter bottomInset={insets.bottom} onBook={onBook} />
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    backgroundColor: colors.background,
  },
  loading: {
    padding: space(2),
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    padding: space(2),
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: space(1),
    paddingVertical: space(0.5),
    borderRadius: radius.full,
    backgroundColor: colors.primarySubtle,
    overflow: "hidden",
  },
  name: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  hoursBox: {
    padding: space(1.5),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
}));
