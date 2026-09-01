import { useMutation, useQuery } from "@apollo/client";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import {
  Button,
  Chip,
  Empty,
  Flex,
  Loader,
  RemoteImage,
  Typography,
} from "@/components";
import { MY_RESERVATIONS, useAuth } from "@/graphql";

import {
  defaultReservationSegment,
  filterReservationsBySegment,
  formatReservationWhen,
  statusLabel,
  type ReservationListSegment,
} from "./helpers/reservation-display.helpers";

type ReservationItem = {
  id: string;
  status: string;
  slotStart: string;
  slotEnd?: string | null;
  partySize: number;
  depositAmountCents?: number | null;
  depositStatus?: string | null;
  hasReview?: boolean | null;
  restaurant?: {
    id?: string;
    name?: string;
    photos?: (string | null)[] | null;
    address?: { city?: string | null } | null;
  } | null;
};

const SEGMENTS: { key: ReservationListSegment; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "deposit", label: "Pay deposit" },
];

export function ReservationsFeature() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, loading, refetch } = useQuery<{ myReservations: ReservationItem[] }>(
    MY_RESERVATIONS,
    {
      skip: !user,
      fetchPolicy: "cache-and-network",
    },
  );

  const reservations = data?.myReservations ?? [];
  const [segment, setSegment] = useState<ReservationListSegment>(() =>
    defaultReservationSegment(reservations),
  );

  const filtered = useMemo(
    () => filterReservationsBySegment(reservations, segment),
    [reservations, segment],
  );

  if (authLoading) return null;

  if (!user) {
    return (
      <Flex flex={1} style={styles.screen} justifyContent="center">
        <Empty
          title="Sign in to see reservations"
          description="Your upcoming and past bookings will appear on this tab."
        >
          <Button
            onPress={() =>
              router.push({
                pathname: "/sign-in",
                params: { next: "/reservations" },
              })
            }
          >
            Sign in
          </Button>
        </Empty>
      </Flex>
    );
  }

  return (
    <View style={styles.screen}>
      <Typography weight="bold" size="text-xl" style={styles.heading}>
        Reservations
      </Typography>

      <Flex direction="row" gap={1} style={styles.segmentRow}>
        {SEGMENTS.map(({ key, label }) => (
          <Chip
            key={key}
            selected={segment === key}
            onPress={() => setSegment(key)}
          >
            {label}
          </Chip>
        ))}
      </Flex>

      {loading && reservations.length === 0 ? (
        <Flex flex={1} justifyContent="center" alignItems="center">
          <Loader />
        </Flex>
      ) : filtered.length === 0 ? (
        <Empty
          title="No reservations yet"
          description="When you book a table, it will show up here."
        >
          <Button onPress={() => refetch()}>Refresh</Button>
        </Empty>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ReservationCard
              item={item}
              onPress={() =>
                router.push({
                  pathname: "/reservations/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}

function ReservationCard({
  item,
  onPress,
}: {
  item: ReservationItem;
  onPress: () => void;
}) {
  const photo = item.restaurant?.photos?.find(Boolean);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Flex direction="row" gap={1.5} alignItems="center">
        {photo ? (
          <RemoteImage uri={photo} style={styles.thumb} recyclingKey={item.id} />
        ) : (
          <View style={styles.thumbPlaceholder} />
        )}
        <Flex gap={0.25} style={styles.meta}>
          <Typography weight="semibold" numberOfLines={1}>
            {item.restaurant?.name ?? "Restaurant"}
          </Typography>
          <Typography size="text-sm" color="secondary">
            {formatReservationWhen(item.slotStart)}
          </Typography>
          <Typography size="text-xs" color="muted">
            {item.partySize} guests · {statusLabel(item.status)}
          </Typography>
        </Flex>
      </Flex>
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: space(2),
  },
  heading: {
    paddingHorizontal: space(2),
    marginBottom: space(1.5),
  },
  segmentRow: {
    paddingHorizontal: space(2),
    marginBottom: space(1.5),
    flexWrap: "wrap",
  },
  list: {
    paddingHorizontal: space(2),
    paddingBottom: space(4),
  },
  card: {
    padding: space(1.5),
    marginBottom: space(1),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
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
    backgroundColor: colors.slate3,
  },
  meta: {
    flex: 1,
  },
}));
