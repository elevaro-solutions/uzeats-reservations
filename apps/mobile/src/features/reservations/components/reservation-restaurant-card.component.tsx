import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronRightIcon } from "@/assets";
import { Flex, RemoteImage, Typography } from "@/components";

import { formatVisitAddress } from "../helpers/reservation-display.helpers";

export type ReservationRestaurantCardProps = {
  restaurant?: {
    id?: string;
    name?: string | null;
    photos?: (string | null)[] | null;
    address?: {
      line1?: string | null;
      neighborhood?: string | null;
      city?: string | null;
      state?: string | null;
      zip?: string | null;
    } | null;
  } | null;
  reservationId: string;
  onPress?: () => void;
};

export function ReservationRestaurantCard({
  restaurant,
  reservationId,
  onPress,
}: ReservationRestaurantCardProps) {
  const { theme } = useUnistyles();
  const photo = restaurant?.photos?.find(Boolean);
  const addressLabel = formatVisitAddress(restaurant?.address);

  const content = (
    <Flex direction="row" gap={1.5} alignItems="center">
      {photo ? (
        <RemoteImage
          uri={photo}
          style={styles.thumb}
          recyclingKey={reservationId}
        />
      ) : (
        <View style={styles.thumbPlaceholder} />
      )}
      <Flex gap={0.25} style={styles.copy}>
        <Typography weight="semibold" numberOfLines={1}>
          {restaurant?.name ?? "Restaurant"}
        </Typography>
        {addressLabel ? (
          <Typography size="text-sm" color="muted" numberOfLines={1}>
            {addressLabel}
          </Typography>
        ) : null}
      </Flex>
      {onPress ? (
        <ChevronRightIcon size={20} color={theme.colors.textMuted} />
      ) : null}
    </Flex>
  );

  if (!onPress) {
    return (
      <View style={styles.cardShadow}>
        <View style={styles.card}>{content}</View>
      </View>
    );
  }

  return (
    <View style={styles.cardShadow}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`View ${restaurant?.name ?? "restaurant"}`}
      >
        {content}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  cardShadow: {
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.slate3,
    overflow: "hidden",
  },
  cardPressed: {
    backgroundColor: colors.slate2,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  thumbPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.slate3,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
}));
