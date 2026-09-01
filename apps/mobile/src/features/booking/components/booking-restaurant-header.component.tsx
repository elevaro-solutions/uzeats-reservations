import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex, RemoteImage, Typography } from "@/components";

import type { RestaurantBookingInfo } from "../types";

export type BookingRestaurantHeaderProps = {
  restaurant: RestaurantBookingInfo;
};

export function BookingRestaurantHeader({
  restaurant,
}: BookingRestaurantHeaderProps) {
  const photo = restaurant.photos?.find(Boolean);
  const addressLine = [
    restaurant.address?.line1,
    restaurant.address?.city,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <View style={styles.card}>
      <Flex direction="row" gap={1.5} alignItems="center">
        {photo ? (
          <RemoteImage uri={photo} style={styles.thumb} recyclingKey={restaurant.id} />
        ) : (
          <View style={styles.thumbPlaceholder} />
        )}
        <Flex gap={0.25} style={styles.meta}>
          <Typography weight="semibold" numberOfLines={2}>
            {restaurant.name}
          </Typography>
          {addressLine ? (
            <Typography size="text-sm" color="secondary" numberOfLines={2}>
              {addressLine}
            </Typography>
          ) : null}
          {restaurant.averageRating != null && restaurant.averageRating > 0 ? (
            <Typography size="text-xs" color="muted">
              ★ {restaurant.averageRating.toFixed(1)}
              {restaurant.reviewCount != null
                ? ` (${restaurant.reviewCount})`
                : ""}
            </Typography>
          ) : null}
        </Flex>
      </Flex>
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  card: {
    marginHorizontal: space(2),
    marginTop: space(2),
    marginBottom: space(1.5),
    padding: space(1.5),
    borderRadius: radius.lg,
    backgroundColor: colors.slate2,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.slate4,
  },
  meta: {
    flex: 1,
  },
}));
