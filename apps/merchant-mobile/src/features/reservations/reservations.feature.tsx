import { useMutation, useQuery } from "@apollo/client";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
  filterReservationsForRange,
  type RangeKey,
} from "./helpers/reservations-list.helpers";

type ReservationsQuery = {
  restaurantReservations: {
    total: number;
    items: ReservationListItem[];
  };
};

export function ReservationsFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeRestaurantId, activeRestaurant, loading: restaurantsLoading } =
    useActiveRestaurant();
  const timeZone = activeRestaurant?.timezone ?? PLATFORM_TIMEZONE;
  const [range, setRange] = useState<RangeKey>("today");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const queryDate = range === "today" ? todayIsoDate(timeZone) : undefined;
  const todayLabel = formatDisplayDate(todayIsoDate(timeZone));

  const { data, loading, error, refetch } = useQuery<ReservationsQuery>(
    RESTAURANT_RESERVATIONS,
    {
      skip: !activeRestaurantId,
      variables: {
        restaurantId: activeRestaurantId,
        date: queryDate,
        limit: 100,
        offset: 0,
      },
      fetchPolicy: "cache-and-network",
    },
  );

  const [updateStatus] = useMutation(UPDATE_RESERVATION_STATUS);

  const items = useMemo(
    () =>
      filterReservationsForRange(
        data?.restaurantReservations?.items ?? [],
        range,
        timeZone,
      ),
    [data, range, timeZone],
  );
  const listRows = useMemo(
    () => buildListRows(items, range, timeZone),
    [items, range, timeZone],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  async function handleAction(
    reservation: ReservationListItem,
    action: ReservationAction,
  ) {
    setUpdatingId(reservation.id);
    try {
      await updateStatus({
        variables: { id: reservation.id, status: action.status },
      });
      toast.success(`Marked ${action.label.toLowerCase()}`);
      await refetch();
    } catch (err) {
      toast.error("Couldn't update reservation", {
        description: getGraphQLErrorMessage(err, "Please try again"),
      });
    } finally {
      setUpdatingId(null);
    }
  }

  const isLoading = restaurantsLoading || (loading && !data);
  const showEmptyAdd = range === "today" && items.length === 0;

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

      <View style={styles.filters}>
        <SegmentedControl
          options={[
            { value: "today", label: "Today" },
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past" },
          ]}
          value={range}
          onChange={setRange}
        />
      </View>

      {error ? (
        <View style={styles.pad}>
          <InlineAlert
            tone="error"
            title="Couldn't load reservations"
            message={error.message}
          />
          <Button
            fullWidth
            style={styles.retry}
            onPress={() => {
              void refetch();
            }}
          >
            Try again
          </Button>
        </View>
      ) : null}

      {isLoading ? (
        <ReservationListSkeleton count={4} />
      ) : (
        <ReservationsListBody
          listRows={listRows}
          range={range}
          timeZone={timeZone}
          showEmptyAdd={showEmptyAdd}
          refreshing={refreshing}
          updatingId={updatingId}
          onRefresh={() => {
            void onRefresh();
          }}
          onOpenCreate={() => router.push("/reservations/create")}
          onOpenDetail={(id) => router.push(`/reservations/${id}`)}
          onAction={(reservation, action) => {
            void handleAction(reservation, action);
          }}
        />
      )}
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
  },
  pad: {
    paddingHorizontal: space(2),
  },
  retry: {
    marginTop: space(1.5),
  },
}));
