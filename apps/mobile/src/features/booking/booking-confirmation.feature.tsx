import { useQuery } from "@apollo/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ArmchairIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
} from "@/assets";
import {
  Button,
  Flex,
  InlineAlert,
  Loader,
  RemoteImage,
  Typography,
} from "@/components";
import { IconPropsType } from "@/types";

import { MY_RESERVATION } from "./api/booking.operations";
import { formatGuestCount } from "./helpers/format-guest-count.helpers";
import {
  formatSlotDateLong,
  formatSlotTime,
  shortReservationRef,
} from "./helpers/time-slots.helpers";

const DEFAULT_PHOTO =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop&auto=format&q=80";

type MyReservationResult = {
  myReservation: {
    id: string;
    status: string;
    slotStart: string;
    slotEnd?: string | null;
    partySize: number;
    occasion?: string | null;
    guestNotes?: string | null;
    depositAmountCents?: number | null;
    depositStatus?: string | null;
    clientSecret?: string | null;
    loyaltyPointsEarned?: number | null;
    hasReview?: boolean | null;
    packageTitle?: string | null;
    packagePriceCents?: number | null;
    restaurant?: {
      id: string;
      name: string;
      slug?: string | null;
      photos?: (string | null)[] | null;
      phone?: string | null;
      address?: {
        line1?: string | null;
        line2?: string | null;
        city?: string | null;
        state?: string | null;
        zip?: string | null;
      } | null;
    } | null;
    tables?: {
      id: string;
      name: string;
      photoUrl?: string | null;
      floorArea?: string | null;
    }[] | null;
  } | null;
};

function pickPhoto(photos?: (string | null)[] | null): string {
  const valid = (photos ?? []).filter(
    (p): p is string => typeof p === "string" && p.trim().length > 0,
  );
  return valid[0] ?? DEFAULT_PHOTO;
}

function MetaRow({
  icon,
  children,
}: {
  icon: ReactElement<IconPropsType>;
  children: ReactNode;
}) {
  return (
    <Flex direction="row" alignItems="center" gap={1.5}>
      <View style={styles.metaIcon}>{icon}</View>
      <View style={styles.metaContent}>{children}</View>
    </Flex>
  );
}

export function BookingConfirmationFeature() {
  const { reservationId } = useLocalSearchParams<{ reservationId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  const { data, loading, error } = useQuery<MyReservationResult>(MY_RESERVATION, {
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
        <InlineAlert
          tone="error"
          title="Could not load confirmation"
          message="Something went wrong loading your reservation details. Try again from Home."
        />
        <Button
          fullWidth
          size="xl"
          variant="outlined"
          color="secondary"
          onPress={() => router.replace("/(tabs)")}
        >
          Home
        </Button>
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
  const tableName = reservation.tables?.[0]?.name ?? null;
  const iconColor = theme.colors.textSecondary;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + theme.space(16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Flex alignItems="center" gap={1} style={styles.hero}>
          <View style={styles.successHalo}>
            <View style={styles.successIcon}>
              <CheckIcon
                size={32}
                color={theme.colors.white}
                strokeWidth={2.5}
              />
            </View>
          </View>
          <Typography weight="bold" size="text-xl" align="center">
            Reservation confirmed
          </Typography>
          <Typography size="text-sm" color="secondary" align="center">
            Ref {shortReservationRef(reservation.id)}
          </Typography>
        </Flex>

        <View style={styles.card}>
          <Flex direction="row" gap={1.5} alignItems="center">
            <RemoteImage
              uri={photo}
              style={styles.thumb}
              recyclingKey={reservation.id}
            />
            <Flex gap={0.5} style={styles.meta}>
              <Typography weight="semibold">{restaurant?.name}</Typography>
              {address ? (
                <Flex direction="row" alignItems="flex-start" gap={0.75}>
                  <MapPinIcon size={14} color={iconColor} />
                  <Typography
                    size="text-sm"
                    color="secondary"
                    numberOfLines={2}
                    style={styles.addressText}
                  >
                    {address}
                  </Typography>
                </Flex>
              ) : null}
            </Flex>
          </Flex>
        </View>

        <View style={styles.card}>
          <Flex gap={2}>
            <MetaRow icon={<CalendarIcon size={20} color={iconColor} />}>
              <Typography weight="medium">
                {formatSlotDateLong(reservation.slotStart)}
              </Typography>
            </MetaRow>
            <MetaRow icon={<ClockIcon size={20} color={iconColor} />}>
              <Typography weight="medium">
                {formatSlotTime(reservation.slotStart)}
              </Typography>
            </MetaRow>
            <MetaRow icon={<UserIcon size={20} color={iconColor} />}>
              <Typography weight="medium">
                {formatGuestCount(reservation.partySize)}
              </Typography>
            </MetaRow>
            {tableName ? (
              <MetaRow icon={<ArmchairIcon size={20} color={iconColor} />}>
                <Typography weight="medium">Table {tableName}</Typography>
              </MetaRow>
            ) : null}
          </Flex>
        </View>

        <InlineAlert
          tone="warning"
          message="Reservations may be cancelled automatically if guests do not arrive within 15 minutes of the booked time. Check your email for updates."
        />
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
          color="secondary"
          onPress={() => router.replace("/(tabs)/reservations")}
        >
          All reservations
        </Button>
        <Button
          fullWidth
          size="xl"
          variant="outlined"
          color="secondary"
          onPress={() => router.replace("/(tabs)")}
        >
          Home
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
    padding: space(2.5),
    gap: space(2),
  },
  hero: {
    paddingTop: space(2),
    paddingBottom: space(1),
  },
  successHalo: {
    width: space(12),
    height: space(12),
    borderRadius: radius.full,
    backgroundColor: colors.successSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space(0.5),
  },
  successIcon: {
    width: space(8),
    height: space(8),
    borderRadius: radius.full,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    padding: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.slate1,
    borderWidth: 1,
    borderColor: colors.slate4,
  },
  metaIcon: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  metaContent: {
    flex: 1,
    minWidth: 0,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  addressText: {
    flex: 1,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space(2.5),
    paddingTop: space(1.5),
    gap: space(1),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    ...shadows.stickyFooter,
  },
}));
