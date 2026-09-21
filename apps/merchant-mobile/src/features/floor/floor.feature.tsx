import { useMutation, useQuery } from "@apollo/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import {
  Button,
  Empty,
  Flex,
  InlineAlert,
  Typography,
} from "@/components";
import { useActiveRestaurant } from "@/features/restaurants";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";
import { formatSlotDateTime } from "@/lib/helpers/date-time.helpers";

import {
  FLOOR_PLAN_OPS,
  SEAT_RESERVATION_AT_TABLE,
  UPDATE_RESERVATION_STATUS,
} from "./api/floor.operations";
import {
  FLOOR_AREA_ALL,
  FloorAreaPicker,
} from "./components/floor-area-picker.component";
import {
  FloorAreaPickerSkeleton,
  FloorSkeleton,
} from "./components/floor-skeleton.component";
import { FloorStatusLegend } from "./components/floor-status-legend.component";
import { FloorTableCard } from "./components/floor-table-card.component";
import { FloorTableSheet } from "./components/floor-table-sheet.component";

type FloorTableState = {
  status: string;
  seatedMinutes?: number | null;
  turnMinutesRemaining?: number | null;
  table: {
    id: string;
    name: string;
    minCapacity: number;
    maxCapacity: number;
    floorArea?: string | null;
  };
  reservation?: {
    id: string;
    partySize: number;
    slotStart: string;
    status: string;
    diner?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
};

type UnassignedReservation = {
  id: string;
  partySize: number;
  slotStart: string;
  status: string;
  diner?: { firstName?: string | null; lastName?: string | null } | null;
};

type FloorOpsQuery = {
  floorPlanOps: {
    date: string;
    tables: FloorTableState[];
    unassigned: UnassignedReservation[];
  };
};

function guestName(
  diner?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null,
): string {
  return (
    [diner?.firstName, diner?.lastName].filter(Boolean).join(" ") || "Guest"
  );
}

export function FloorFeature() {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const {
    activeRestaurant,
    loading: restaurantsLoading,
    restaurantsReady,
    error: restaurantsError,
    refetch: refetchRestaurants,
  } = useActiveRestaurant();
  const restaurantId = activeRestaurant?.id ?? null;

  const [selected, setSelected] = useState<FloorTableState | null>(null);
  const [selectedUnassignedId, setSelectedUnassignedId] = useState<
    string | null
  >(null);
  const [areaFilter, setAreaFilter] = useState(FLOOR_AREA_ALL);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, refetch } = useQuery<FloorOpsQuery>(
    FLOOR_PLAN_OPS,
    {
      // Only query once myRestaurants confirms the venue — avoids CastError from stale MMKV ids.
      skip: !restaurantId,
      variables: { restaurantId },
      pollInterval: 10_000,
      fetchPolicy: "cache-and-network",
    },
  );

  const [seatAtTable] = useMutation(SEAT_RESERVATION_AT_TABLE);
  const [updateStatus] = useMutation(UPDATE_RESERVATION_STATUS);

  const tables = data?.floorPlanOps?.tables ?? [];
  const unassigned = data?.floorPlanOps?.unassigned ?? [];

  const floorAreas = useMemo(
    () =>
      Array.from(
        new Set(
          tables
            .map((s) => s.table.floorArea?.trim())
            .filter((area): area is string => Boolean(area)),
        ),
      ).sort(),
    [tables],
  );

  useEffect(() => {
    if (areaFilter !== FLOOR_AREA_ALL && !floorAreas.includes(areaFilter)) {
      setAreaFilter(FLOOR_AREA_ALL);
    }
  }, [areaFilter, floorAreas]);

  const visibleTables = useMemo(
    () =>
      tables.filter(
        (s) =>
          areaFilter === FLOOR_AREA_ALL || s.table.floorArea === areaFilter,
      ),
    [tables, areaFilter],
  );

  const selectedUnassigned = useMemo(
    () => unassigned.find((r) => r.id === selectedUnassignedId) ?? null,
    [unassigned, selectedUnassignedId],
  );

  async function seatHere() {
    if (!selected) return;
    const reservationId =
      selected.reservation?.id ?? selectedUnassignedId ?? null;
    if (!reservationId) {
      toast.error("Select an arriving party first");
      return;
    }
    setBusy(true);
    try {
      await seatAtTable({
        variables: { reservationId, tableId: selected.table.id },
      });
      toast.success("Guest seated");
      setSelected(null);
      setSelectedUnassignedId(null);
      await refetch();
    } catch (err) {
      toast.error("Couldn't seat guest", {
        description: getGraphQLErrorMessage(err, "Please try again"),
      });
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: string) {
    const reservationId = selected?.reservation?.id;
    if (!reservationId) return;
    const STATUS_TOAST_LABELS: Record<string, string> = {
      completed: "complete",
      no_show: "no-show",
      cancelled: "cancel",
    };
    const statusLabel = STATUS_TOAST_LABELS[status] ?? status;
    setBusy(true);
    try {
      await updateStatus({ variables: { id: reservationId, status } });
      toast.success(`Marked ${statusLabel}`);
      setSelected(null);
      await refetch();
    } catch (err) {
      toast.error("Couldn't update status", {
        description: getGraphQLErrorMessage(err, "Please try again"),
      });
    } finally {
      setBusy(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const bootstrapping = restaurantsLoading || !restaurantsReady;
  const isLoading =
    bootstrapping || (Boolean(restaurantId) && loading && !data);
  // Prefer live data over a sticky Apollo error once a poll succeeds
  const loadError = restaurantsError ?? (error && !data ? error : undefined);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Flex
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        style={styles.header}
      >
        <Typography weight="bold" size="display-xs" style={styles.titleText}>
          Floor
        </Typography>
        {isLoading ? (
          <FloorAreaPickerSkeleton />
        ) : !loadError && restaurantId ? (
          <FloorAreaPicker
            areas={floorAreas}
            value={areaFilter}
            onChange={setAreaFilter}
          />
        ) : null}
      </Flex>

      {isLoading ? (
        <FloorSkeleton />
      ) : loadError ? (
        <View style={[styles.pad, styles.stateBlock]}>
          <InlineAlert
            tone="error"
            message={getGraphQLErrorMessage(
              loadError,
              loadError.message || "Something went wrong",
            )}
          />
          <Button
            fullWidth
            style={styles.retry}
            onPress={() => {
              if (restaurantsError) {
                void refetchRestaurants();
              } else {
                void refetch();
              }
            }}
          >
            Try again
          </Button>
        </View>
      ) : !restaurantId ? (
        <View style={styles.stateBlock}>
          <Empty
            title="No restaurant"
            description="Add a venue in Partner Hub, then switch to it here."
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + theme.space(4) },
          ]}
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
        >
          <FloorStatusLegend />

          {unassigned.length > 0 ? (
            <Flex gap={1.5}>
              <Typography weight="semibold" size="text-lg">
                Arriving (unassigned)
              </Typography>
              <Flex gap={1}>
                {unassigned.map((item) => {
                  const selectedRow = item.id === selectedUnassignedId;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() =>
                        setSelectedUnassignedId(selectedRow ? null : item.id)
                      }
                      style={({ pressed }) => [
                        styles.unassigned,
                        selectedRow && styles.unassignedSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Typography weight="semibold" size="text-md">
                        {guestName(item.diner)}
                      </Typography>
                      <Typography size="text-sm" color="secondary">
                        {formatSlotDateTime(item.slotStart)} · party of{" "}
                        {item.partySize}
                      </Typography>
                    </Pressable>
                  );
                })}
              </Flex>
            </Flex>
          ) : null}

          {visibleTables.length === 0 ? (
            <Empty
              title="No tables"
              description={
                tables.length === 0
                  ? "Add tables in Partner Hub to run floor ops."
                  : "No tables in this area."
              }
            />
          ) : (
            <View style={styles.grid}>
              {visibleTables.map((state) => (
                <FloorTableCard
                  key={state.table.id}
                  status={state.status}
                  table={state.table}
                  guestLabel={
                    state.reservation
                      ? guestName(state.reservation.diner)
                      : null
                  }
                  turnMinutesRemaining={state.turnMinutesRemaining}
                  selected={selected?.table.id === state.table.id}
                  onPress={() => setSelected(state)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <FloorTableSheet
        visible={Boolean(selected)}
        selected={selected}
        seatGuestName={
          selectedUnassigned ? guestName(selectedUnassigned.diner) : null
        }
        busy={busy}
        onClose={() => setSelected(null)}
        onSeatHere={() => {
          void seatHere();
        }}
        onChangeStatus={(status) => {
          void changeStatus(status);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: space(2.5),
    paddingTop: space(1),
    paddingBottom: space(2),
    gap: space(1),
    minHeight: space(5),
  },
  titleText: {
    flexShrink: 0,
    lineHeight: 30,
  },
  pad: {
    paddingHorizontal: space(2.5),
  },
  stateBlock: {
    flex: 1,
    justifyContent: "center",
  },
  retry: {
    marginTop: space(1.5),
  },
  content: {
    paddingHorizontal: space(2.5),
    gap: space(3),
  },
  unassigned: {
    minHeight: space(7.5),
    paddingVertical: space(1.5),
    paddingHorizontal: space(2),
    borderRadius: radius.md,
    backgroundColor: colors.slate2,
    gap: space(0.5),
  },
  unassignedSelected: {
    backgroundColor: colors.primary2,
  },
  pressed: {
    opacity: 0.85,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space(2),
    justifyContent: "space-between",
    paddingVertical: space(0.5),
  },
}));
