import { useMutation, useQuery } from "@apollo/client";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { ClockIcon, PlusIcon } from "@/assets";
import {
  Button,
  Empty,
  Flex,
  IconButton,
  InlineAlert,
  Loader,
  SegmentedControl,
  Typography,
} from "@/components";
import { useActiveRestaurant } from "@/features/restaurants";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";
import {
  formatDisplayDate,
  formatRelativeDayLabel,
  toIsoDate,
  todayIsoDate,
} from "@/lib/helpers/date-time.helpers";

import {
  RESTAURANT_RESERVATIONS,
  UPDATE_RESERVATION_STATUS,
} from "./api/reservations.operations";
import { ReservationCard } from "./components/reservation-card.component";
import type { ReservationListItem } from "./components/reservation-card.component";
import type { ReservationAction } from "./helpers/reservation-status.helpers";

type RangeKey = "today" | "upcoming" | "past";

type ReservationsQuery = {
  restaurantReservations: {
    total: number;
    items: ReservationListItem[];
  };
};

type ListRow =
  | { type: "header"; id: string; label: string }
  | { type: "reservation"; id: string; reservation: ReservationListItem };

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function buildListRows(
  items: ReservationListItem[],
  range: RangeKey,
): ListRow[] {
  if (range === "today") {
    return items.map((reservation) => ({
      type: "reservation" as const,
      id: reservation.id,
      reservation,
    }));
  }

  const rows: ListRow[] = [];
  let lastDay: string | null = null;

  for (const reservation of items) {
    const dayIso = toIsoDate(new Date(reservation.slotStart));
    if (dayIso !== lastDay) {
      lastDay = dayIso;
      rows.push({
        type: "header",
        id: `day-${dayIso}`,
        label: formatRelativeDayLabel(dayIso),
      });
    }
    rows.push({
      type: "reservation",
      id: reservation.id,
      reservation,
    });
  }

  return rows;
}

export function ReservationsFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { activeRestaurantId, loading: restaurantsLoading } =
    useActiveRestaurant();
  const [range, setRange] = useState<RangeKey>("today");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const queryDate = range === "today" ? todayIsoDate() : undefined;
  const todayLabel = formatDisplayDate(todayIsoDate());

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

  const items = useMemo(() => {
    const raw = data?.restaurantReservations?.items ?? [];
    const start = startOfToday();
    const end = endOfToday();

    const filtered = raw.filter((item) => {
      const slot = new Date(item.slotStart).getTime();
      if (range === "today" && (slot < start || slot > end)) return false;
      if (range === "upcoming" && slot < start) return false;
      if (range === "past" && slot >= start) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const diff =
        new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime();
      return range === "past" ? -diff : diff;
    });
  }, [data, range]);

  const listRows = useMemo(() => buildListRows(items, range), [items, range]);

  const stickyHeaderIndices = useMemo(() => {
    if (range === "today") return undefined;
    return listRows
      .map((row, index) => (row.type === "header" ? index : -1))
      .filter((index) => index >= 0);
  }, [listRows, range]);

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
          icon={<ClockIcon />}
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
        <Loader fullScreen />
      ) : (
        <FlashList
          data={listRows}
          keyExtractor={(item) => item.id}
          stickyHeaderIndices={stickyHeaderIndices}
          getItemType={(item) =>
            item.type === "header" ? "sectionHeader" : "row"
          }
          contentContainerStyle={{
            paddingTop: theme.space(1.5),
            paddingBottom: insets.bottom + theme.space(12),
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void onRefresh();
              }}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Empty
                title="No reservations"
                description={
                  range === "today"
                    ? "Nothing on the books for today."
                    : "No reservations in this range."
                }
              />
              {showEmptyAdd ? (
                <Button
                  fullWidth
                  size="lg"
                  style={styles.emptyAdd}
                  onPress={() => router.push("/reservations/create")}
                >
                  Add reservation
                </Button>
              ) : null}
            </View>
          }
          renderItem={({ item, target }) => {
            if (item.type === "header") {
              // FlashList clones sticky headers; hide the in-list cell so only
              // the floating StickyHeader is visible (v2 has no hideRelatedCell).
              return (
                <View
                  style={[
                    styles.dayHeader,
                    target === "Cell" && styles.dayHeaderInList,
                  ]}
                  accessibilityElementsHidden={target === "Cell"}
                  importantForAccessibility={
                    target === "Cell" ? "no-hide-descendants" : "yes"
                  }
                >
                  <Typography
                    weight="semibold"
                    size="text-sm"
                    color="muted"
                    align="center"
                  >
                    {item.label}
                  </Typography>
                </View>
              );
            }

            return (
              <View style={styles.cardWrap}>
                <ReservationCard
                  reservation={item.reservation}
                  actionLoading={updatingId === item.reservation.id}
                  onPress={() =>
                    router.push(`/reservations/${item.reservation.id}`)
                  }
                  onAction={(action) => {
                    void handleAction(item.reservation, action);
                  }}
                />
              </View>
            );
          }}
        />
      )}

      <Pressable
        onPress={() => router.push("/reservations/create")}
        style={({ pressed }) => [
          styles.fab,
          { bottom: theme.space(3.5) },
          pressed && styles.fabPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add reservation"
      >
        <PlusIcon size={24} color={theme.colors.white} strokeWidth={2.5} />
      </Pressable>
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
    borderBottomColor: colors.slate3,
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
  dayHeader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space(1.25),
    paddingHorizontal: space(2),
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.slate3,
  },
  dayHeaderInList: {
    opacity: 0,
  },
  cardWrap: {
    marginBottom: space(1.5),
    paddingHorizontal: space(2),
  },
  emptyWrap: {
    paddingTop: space(4),
    paddingHorizontal: space(2),
    gap: space(2),
  },
  emptyAdd: {
    marginTop: space(0.5),
  },
  fab: {
    position: "absolute",
    right: space(2.5),
    width: space(7),
    height: space(7),
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  fabPressed: {
    backgroundColor: colors.primaryPress,
    opacity: 0.92,
  },
}));
