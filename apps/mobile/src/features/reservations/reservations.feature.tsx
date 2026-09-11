import { useQuery } from "@apollo/client";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Button,
  Empty,
  Flex,
  InlineAlert,
  SegmentedControl,
  Typography,
} from "@/components";
import { MY_RESERVATIONS, useAuth } from "@/graphql";

import { ReservationListCard } from "./components/reservation-list-card.component";
import { ReservationListSkeleton } from "./components/reservation-list-skeleton.component";
import {
  defaultReservationSegment,
  emptyCopyForSegment,
  filterReservationsBySegment,
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
    address?: {
      city?: string | null;
      neighborhood?: string | null;
      line1?: string | null;
    } | null;
  } | null;
};

const SEGMENTS: { value: ReservationListSegment; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
];

export function ReservationsFeature() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { data, loading, error, refetch } = useQuery<{
    myReservations: ReservationItem[];
  }>(MY_RESERVATIONS, {
    skip: !user,
    fetchPolicy: "cache-and-network",
  });

  const reservations = data?.myReservations ?? [];
  const [segment, setSegment] = useState<ReservationListSegment>("upcoming");
  const [segmentInitialized, setSegmentInitialized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (segmentInitialized || reservations.length === 0) return;
    setSegment(defaultReservationSegment(reservations));
    setSegmentInitialized(true);
  }, [reservations, segmentInitialized]);

  const filtered = useMemo(
    () => filterReservationsBySegment(reservations, segment),
    [reservations, segment],
  );

  const emptyCopy = emptyCopyForSegment(segment);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  if (authLoading) {
    return (
      <Flex
        flex={1}
        style={[styles.screen, { paddingTop: insets.top + theme.space(2) }]}
      >
        <Typography weight="bold" size="display-xs" style={styles.heading}>
          Reservations
        </Typography>
        <ReservationListSkeleton />
      </Flex>
    );
  }

  if (!user) {
    return (
      <Flex
        flex={1}
        style={[styles.screen, { paddingTop: insets.top + theme.space(2) }]}
        justifyContent="center"
      >
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
    <View style={[styles.screen, { paddingTop: insets.top + theme.space(2) }]}>
      <Typography weight="bold" size="display-xs" style={styles.heading}>
        Reservations
      </Typography>

      <SegmentedControl
        options={SEGMENTS}
        value={segment}
        onChange={setSegment}
        style={styles.segments}
      />

      {error && reservations.length === 0 ? (
        <Flex style={styles.statePad} gap={1.5}>
          <InlineAlert
            tone="error"
            message="Couldn't load reservations. Pull to retry or tap below."
          />
          <Button variant="outlined" onPress={() => void refetch()}>
            Retry
          </Button>
        </Flex>
      ) : loading && reservations.length === 0 ? (
        <ReservationListSkeleton />
      ) : filtered.length === 0 ? (
        <Flex flex={1} justifyContent="center" style={styles.statePad}>
          <Empty title={emptyCopy.title} description={emptyCopy.description}>
            <Button variant="outlined" onPress={() => void refetch()}>
              Refresh
            </Button>
          </Empty>
        </Flex>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
          }
          renderItem={({ item }) => (
            <ReservationListCard
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

const styles = StyleSheet.create(({ space, colors }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heading: {
    paddingHorizontal: space(2),
    marginBottom: space(1.5),
  },
  segments: {
    marginHorizontal: space(2),
    marginBottom: space(2.5),
  },
  list: {
    paddingHorizontal: space(2),
    paddingBottom: space(4),
  },
  statePad: {
    paddingHorizontal: space(2),
  },
}));
