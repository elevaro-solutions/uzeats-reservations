import { useQuery } from "@apollo/client";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLayoutEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  View,
} from "react-native";
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
} from "@/features/discovery";
import { RESTAURANT, useAuth } from "@/graphql";

type RestaurantDetail = {
  id: string;
  name: string;
  description?: string | null;
  cuisine: string;
  priceRange: number;
  photos: string[];
  averageRating: number;
  reviewCount: number;
  featured?: boolean;
  wheelchairAccessible?: boolean;
  amenities?: string[];
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    zip?: string | null;
    neighborhood?: string | null;
  };
  shifts?: Array<{
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    active: boolean;
  }>;
};

function hoursSummary(
  shifts: RestaurantDetail["shifts"],
): string | null {
  const active = (shifts ?? []).filter((s) => s.active);
  if (active.length === 0) return null;
  const first = active[0];
  return `${first.startTime} – ${first.endTime}`;
}

export function RestaurantProfileFeature() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const [descExpanded, setDescExpanded] = useState(false);

  const { data, loading, error, refetch } = useQuery<{
    restaurant: RestaurantDetail | null;
  }>(RESTAURANT, {
    variables: { id },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });

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
          <Button variant="outlined" color="secondary" onPress={() => router.back()}>
            Go back
          </Button>
        </Empty>
      </Flex>
    );
  }

  const photo = restaurant.photos?.[0];
  const hours = hoursSummary(restaurant.shifts);
  const description = restaurant.description?.trim() ?? "";
  const longDesc = description.length > 180;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: spacePad(insets.bottom) + 88 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={styles.hero}
            resizeMode="cover"
            accessibilityLabel={restaurant.name}
          />
        ) : (
          <Flex
            style={styles.heroPlaceholder}
            justifyContent="center"
            alignItems="center"
          >
            <Typography color="muted">No photo</Typography>
          </Flex>
        )}

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
            <Typography
              size="display-xs"
              weight="bold"
              style={styles.name}
            >
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
              <Typography size="text-sm">
                Hours: {hours}
              </Typography>
            </Flex>
          ) : null}

          {description ? (
            <Flex gap={0.75}>
              <Typography weight="semibold" size="text-lg">
                About
              </Typography>
              <Typography color="secondary" size="text-sm">
                {descExpanded || !longDesc
                  ? description
                  : `${description.slice(0, 180).trim()}…`}
              </Typography>
              {longDesc ? (
                <Button
                  size="sm"
                  variant="text"
                  color="primary"
                  onPress={() => setDescExpanded((v) => !v)}
                >
                  {descExpanded ? "Show less" : "Show more"}
                </Button>
              ) : null}
            </Flex>
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

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <Button fullWidth size="lg" onPress={onBook}>
          Book
        </Button>
      </View>
    </View>
  );
}

function spacePad(n: number): number {
  return n > 0 ? n : 24;
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
  hero: {
    width: "100%",
    height: 240,
    backgroundColor: colors.surface,
  },
  heroPlaceholder: {
    width: "100%",
    height: 240,
    backgroundColor: colors.surface,
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
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
}));
