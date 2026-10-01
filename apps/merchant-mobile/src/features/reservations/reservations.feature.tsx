import { useMutation, useQuery } from "@apollo/client";
import { useRouter } from "expo-router";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { toast } from "sonner-native";

import { ClipboardClockIcon } from "@/assets";
import {
  Button,
  Flex,
  IconButton,
  InlineAlert,
  SegmentedControl,
  Typography,
} from "@/components";
import { useActiveRestaurant } from "@/features/restaurants";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";
import {
  formatDisplayDate,
  todayIsoDate,
} from "@/lib/helpers/date-time.helpers";
import { PLATFORM_TIMEZONE } from "@reservations/shared";

import {
  RESTAURANT_RESERVATIONS,
  UPDATE_RESERVATION_STATUS,
} from "./api/reservations.operations";
import type { ReservationListItem } from "./components/reservation-card.component";
import { ReservationListSkeleton } from "./components/reservation-list-skeleton.component";
import { ReservationsListBody } from "./components/reservations-list-body.component";
import type { ReservationAction } from "./helpers/reservation-status.helpers";
import {
  buildListRows,
  sortReservationsForRange,
  type RangeKey,
} from "./helpers/reservations-list.helpers";

type ReservationsQuery = {
  restaurantReservations: {
    total: number;
    items: ReservationListItem[];
  };
};

const LIST_LIMIT = 100;

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

const PERIOD_QUERY_OPTIONS = {
  fetchPolicy: "cache-and-network" as const,
  nextFetchPolicy: "cache-first" as const,
};

export function ReservationsFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeRestaurantId, activeRestaurant, loading: restaurantsLoading } =
    useActiveRestaurant();
  const timeZone = activeRestaurant?.timezone ?? PLATFORM_TIMEZONE;
  const [range, setRange] = useState<RangeKey>("today");
  // Keep `range` immediate so the tab pill slides instantly; drive the expensive
  // list computation off a deferred copy so the heavy re-render can't block it.
  const deferredRange = useDeferredValue(range);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const todayLabel = formatDisplayDate(todayIsoDate(timeZone));
  const skip = !activeRestaurantId;

  // Warm all three period caches on mount so tab switches are cache hits.
  const todayQuery = useQuery<ReservationsQuery>(RESTAURANT_RESERVATIONS, {
    skip,
    variables: {
      restaurantId: activeRestaurantId,
      period: "today",
      limit: LIST_LIMIT,
      offset: 0,
    },
    ...PERIOD_QUERY_OPTIONS,
  });
  const upcomingQuery = useQuery<ReservationsQuery>(RESTAURANT_RESERVATIONS, {
    skip,
    variables: {
      restaurantId: activeRestaurantId,
      period: "upcoming",
      limit: LIST_LIMIT,
      offset: 0,
    },
    ...PERIOD_QUERY_OPTIONS,
  });
  const pastQuery = useQuery<ReservationsQuery>(RESTAURANT_RESERVATIONS, {
    skip,
    variables: {
      restaurantId: activeRestaurantId,
      period: "past",
      limit: LIST_LIMIT,
      offset: 0,
    },
    ...PERIOD_QUERY_OPTIONS,
  });

  const queries = {
    today: todayQuery,
    upcoming: upcomingQuery,
    past: pastQuery,
  } as const;
  const activeQuery = queries[deferredRange];

  const [updateStatus] = useMutation(UPDATE_RESERVATION_STATUS);

  const items = useMemo(
    () =>
      sortReservationsForRange(
        activeQuery.data?.restaurantReservations?.items ?? [],
        deferredRange,
      ),
    [activeQuery.data, deferredRange],
  );
  const listRows = useMemo(
    () => buildListRows(items, deferredRange, timeZone),
    [items, deferredRange, timeZone],
  );

  const refetchAll = useCallback(async () => {
    await Promise.all([
      todayQuery.refetch(),
      upcomingQuery.refetch(),
      pastQuery.refetch(),
    ]);
  }, [todayQuery.refetch, upcomingQuery.refetch, pastQuery.refetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (range === "today") await todayQuery.refetch();
      else if (range === "upcoming") await upcomingQuery.refetch();
      else await pastQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [range, todayQuery.refetch, upcomingQuery.refetch, pastQuery.refetch]);

  const handleAction = useCallback(
    async (reservation: ReservationListItem, action: ReservationAction) => {
      setUpdatingId(reservation.id);
      try {
        await updateStatus({
          variables: { id: reservation.id, status: action.status },
        });
        toast.success(`Marked ${action.label.toLowerCase()}`);
        await refetchAll();
      } catch (err) {
        toast.error("Couldn't update reservation", {
          description: getGraphQLErrorMessage(err, "Please try again"),
        });
      } finally {
        setUpdatingId(null);
      }
    },
    [refetchAll, updateStatus],
  );

  const onOpenCreate = useCallback(() => {
    router.push("/reservations/create");
  }, [router]);

  const onOpenDetail = useCallback(
    (id: string) => {
      router.push(`/reservations/${id}`);
    },
    [router],
  );

  // Full-screen skeleton only on first paint. Parallel period queries keep
  // upcoming/past warm so later tab switches hit cache without empty flash.
  const bootstrapping =
    restaurantsLoading ||
    (todayQuery.loading &&
      !todayQuery.data &&
      !upcomingQuery.data &&
      !pastQuery.data);
  const tabPending = Boolean(activeQuery.loading && !activeQuery.data);
  const showEmptyAdd =
    deferredRange === "today" &&
    items.length === 0 &&
    !tabPending &&
    !bootstrapping;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Flex
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        style={styles.header}
      >
        <Flex flex={1} gap={0.25} style={styles.headerText}>
          <Typography weight="bold" size="text-xl">
            Reservations
          </Typography>
          <Typography size="text-sm" color="muted">
            {todayLabel}
          </Typography>
        </Flex>
        <IconButton
          icon={<ClipboardClockIcon />}
          variant="surface"
          size="md"
          onPress={() => router.push("/waitlist")}
          accessibilityLabel="Open waitlist"
          style={styles.chromeBtn}
        />
      </Flex>

      <View style={styles.filters} collapsable={false}>
        <SegmentedControl
          options={RANGE_OPTIONS}
          value={range}
          onChange={setRange}
        />
      </View>

      <View style={styles.listPane}>
        {activeQuery.error ? (
          <View style={styles.pad}>
            <InlineAlert
              tone="error"
              title="Couldn't load reservations"
              message={activeQuery.error.message}
            />
            <Button
              fullWidth
              style={styles.retry}
              onPress={() => {
                void activeQuery.refetch();
              }}
            >
              Try again
            </Button>
          </View>
        ) : null}

        {bootstrapping ? (
          <ReservationListSkeleton count={4} />
        ) : (
          <ReservationsListBody
            listRows={listRows}
            range={deferredRange}
            timeZone={timeZone}
            showEmptyAdd={showEmptyAdd}
            pending={tabPending}
            refreshing={refreshing}
            updatingId={updatingId}
            onRefresh={onRefresh}
            onOpenCreate={onOpenCreate}
            onOpenDetail={onOpenDetail}
            onAction={handleAction}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.secondarySubtle,
  },
  headerText: {
    minWidth: 0,
    paddingRight: space(1),
  },
  chromeBtn: {
    width: space(6),
    height: space(6),
    borderRadius: radius.full,
  },
  filters: {
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
    paddingBottom: space(1),
    zIndex: 1,
  },
  listPane: {
    flex: 1,
  },
  pad: {
    paddingHorizontal: space(2),
  },
  retry: {
    marginTop: space(1.5),
  },
}));
