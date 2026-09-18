import { useMutation, useQuery } from "@apollo/client";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { CalendarPlusIcon, UsersIcon } from "@/assets";
import {
  Button,
  Chip,
  Empty,
  Flex,
  IconButton,
  InlineAlert,
  Loader,
  SegmentedControl,
  Typography,
} from "@/components";
import { useActiveRestaurant } from "@/features/restaurants";
import { todayIsoDate } from "@/lib/dates.helpers";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

import {
  RESTAURANT_RESERVATIONS,
  UPDATE_RESERVATION_STATUS,
} from "./api/reservations.operations";
import { ReservationCard } from "./components/reservation-card.component";
import type { ReservationListItem } from "./components/reservation-card.component";
import type { ReservationAction } from "./helpers/reservation-status.helpers";

type RangeKey = "today" | "upcoming" | "past";
type StatusFilter = "all" | "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";

type ReservationsQuery = {
  restaurantReservations: {
    total: number;
    items: ReservationListItem[];
  };
};

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

export function ReservationsFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { activeRestaurantId, loading: restaurantsLoading } =
    useActiveRestaurant();
  const [range, setRange] = useState<RangeKey>("today");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const queryDate = range === "today" ? todayIsoDate() : undefined;

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

    return raw.filter((item) => {
      const slot = new Date(item.slotStart).getTime();
      if (range === "today" && (slot < start || slot > end)) return false;
      if (range === "upcoming" && slot < start) return false;
      if (range === "past" && slot >= start) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      return true;
    });
  }, [data, range, statusFilter]);

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

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Flex
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        style={styles.header}
      >
        <Typography weight="bold" size="text-xl">
          Reservations
        </Typography>
        <Flex direction="row" gap={1} alignItems="center">
          <IconButton
            icon={<UsersIcon />}
            variant="surface"
            size="md"
            onPress={() => router.push("/waitlist")}
            accessibilityLabel="Open waitlist"
            style={styles.chromeBtn}
          />
          <IconButton
            icon={<CalendarPlusIcon />}
            variant="surface"
            size="md"
            onPress={() => router.push("/reservations/create")}
            accessibilityLabel="Create reservation"
            style={styles.chromeBtn}
          />
        </Flex>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusRow}
        >
          {(
            [
              "all",
              "pending",
              "confirmed",
              "seated",
              "completed",
              "cancelled",
              "no_show",
            ] as StatusFilter[]
          ).map((status) => (
            <Chip
              key={status}
              size="md"
              selected={statusFilter === status}
              onPress={() => setStatusFilter(status)}
            >
              {status === "all"
                ? "All"
                : status === "no_show"
                  ? "No-show"
                  : status.charAt(0).toUpperCase() + status.slice(1)}
            </Chip>
          ))}
        </ScrollView>
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
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: theme.space(2),
            paddingBottom: insets.bottom + theme.space(3),
            paddingTop: theme.space(1),
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Empty
              title="No reservations"
              description={
                range === "today"
                  ? "Nothing on the books for today."
                  : "No reservations match these filters."
              }
            />
          }
          renderItem={({ item }) => (
            <ReservationCard
              reservation={item}
              actionLoading={updatingId === item.id}
              onPress={() => router.push(`/reservations/${item.id}`)}
              onAction={(action) => {
                void handleAction(item, action);
              }}
            />
          )}
        />
      )}

      <Pressable
        onPress={() => router.push("/reservations/create")}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + theme.space(2) },
          pressed && styles.fabPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Create reservation"
      >
        <CalendarPlusIcon size={24} color={theme.colors.white} />
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
  },
  chromeBtn: {
    width: space(6),
    height: space(6),
    borderRadius: radius.full,
  },
  filters: {
    paddingHorizontal: space(2),
    gap: space(1.5),
    paddingBottom: space(1),
  },
  statusRow: {
    gap: space(1),
    paddingVertical: space(0.5),
  },
  pad: {
    paddingHorizontal: space(2),
  },
  retry: {
    marginTop: space(1.5),
  },
  separator: {
    height: space(1.5),
  },
  fab: {
    position: "absolute",
    right: space(2),
    width: space(7),
    height: space(7),
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  fabPressed: {
    opacity: 0.85,
  },
}));
