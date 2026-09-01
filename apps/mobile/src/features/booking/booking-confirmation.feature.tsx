import { useQuery } from "@apollo/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Flex, Loader, RemoteImage, Typography } from "@/components";

import { MY_RESERVATION } from "./api/booking.operations";
import {
  formatSlotDateLong,
  formatSlotTime,
  shortReservationRef,
} from "./helpers/time-slots.helpers";

const DEFAULT_PHOTO =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop&auto=format&q=80";

function pickPhoto(photos?: (string | null)[] | null): string {
  const valid = (photos ?? []).filter(
    (p): p is string => typeof p === "string" && p.trim().length > 0,
  );
  return valid[0] ?? DEFAULT_PHOTO;
}

export function BookingConfirmationFeature() {
  const { reservationId } = useLocalSearchParams<{ reservationId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  const { data, loading, error } = useQuery(MY_RESERVATION, {
    variables: { id: reservationId },
    skip: !reservationId,
    fetchPolicy: "network-only",
  });

  const reservation = data?.myReservation;

  if (loading && !reservation) {
    return (
      <Flex flex={1} justifyContent="center" alignItems="center">
        <Loader />
      </Flex>
    );
  }

  if (error || !reservation) {
    return (
      <Flex flex={1} justifyContent="center" style={styles.centered}>
        <Typography weight="semibold">Could not load confirmation</Typography>
        <Button onPress={() => router.replace("/(tabs)")}>Go home</Button>
      </Flex>
    );
  }

  const restaurant = reservation.restaurant;
  const photo = pickPhoto(restaurant?.photos);
  const address = [
    restaurant?.address?.line1,
    restaurant?.address?.city,
    restaurant?.address?.state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + theme.space(12) },
        ]}
      >
        <Flex alignItems="center" gap={1} style={styles.hero}>
          <View style={styles.successIcon}>
            <Typography weight="bold" size="text-xl">
              ✓
            </Typography>
          </View>
          <Typography weight="bold" size="text-xl" align="center">
            Reservation confirmed
          </Typography>
          <Typography color="secondary" align="center">
            Ref {shortReservationRef(reservation.id)}
          </Typography>
        </Flex>

        <View style={styles.summaryCard}>
          <Typography weight="bold" size="text-lg">
            {formatSlotDateLong(reservation.slotStart)}
          </Typography>
          <Flex direction="row" justifyContent="space-between" alignItems="center">
            <Typography size="text-md" color="secondary">
              {formatSlotTime(reservation.slotStart)}
            </Typography>
            <Typography weight="semibold">
              {reservation.partySize} guest
              {reservation.partySize === 1 ? "" : "s"}
            </Typography>
          </Flex>
        </View>

        <View style={styles.restaurantCard}>
          <Flex direction="row" gap={1.5} alignItems="center">
            <RemoteImage uri={photo} style={styles.thumb} recyclingKey={reservation.id} />
            <Flex gap={0.25} style={styles.meta}>
              <Typography weight="semibold">{restaurant?.name}</Typography>
              {address ? (
                <Typography size="text-sm" color="secondary" numberOfLines={2}>
                  {address}
                </Typography>
              ) : null}
            </Flex>
          </Flex>
        </View>

        <Typography size="text-sm" color="secondary" style={styles.policy}>
          Reservations may be cancelled automatically if guests do not arrive within
          15 minutes of the booked time. Check your email for updates.
        </Typography>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, theme.space(2)) },
        ]}
      >
        <Button
          fullWidth
          size="xl"
          onPress={() => router.replace("/(tabs)")}
        >
          Home
        </Button>
        <Button
          fullWidth
          variant="outlined"
          onPress={() => router.replace("/(tabs)/reservations")}
        >
          All reservations
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors, shadows }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    padding: space(2),
    gap: space(2),
  },
  scroll: {
    padding: space(2),
    gap: space(2),
  },
  hero: {
    paddingVertical: space(2),
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.green3,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    padding: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.slate2,
    gap: space(0.75),
  },
  restaurantCard: {
    padding: space(1.5),
    borderRadius: radius.lg,
    backgroundColor: colors.slate2,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  meta: {
    flex: 1,
  },
  policy: {
    paddingHorizontal: space(0.5),
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
    gap: space(1),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    ...shadows.stickyFooter,
  },
}));
