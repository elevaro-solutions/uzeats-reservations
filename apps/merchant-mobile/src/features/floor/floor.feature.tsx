import { useMutation, useQuery } from "@apollo/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Button, Empty, Flex, InlineAlert, Typography } from "@/components";
import { useActiveRestaurant } from "@/features/restaurants";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";
import { guestDisplayName } from "@/lib/helpers";
import { PLATFORM_TIMEZONE } from "@reservations/shared";

import {
  FLOOR_PLAN_OPS,
  SEAT_RESERVATION_AT_TABLE,
  UPDATE_RESERVATION_STATUS,
} from "./api/floor.operations";
import {
  FLOOR_AREA_ALL,
  FloorAreaPicker,
} from "./components/floor-area-picker.component";
import { FloorArrivingSection } from "./components/floor-arriving-section.component";
import {
  FloorAreaPickerSkeleton,
  FloorSkeleton,
} from "./components/floor-skeleton.component";
import { FloorStatusLegend } from "./components/floor-status-legend.component";
import { FloorTableSheet } from "./components/floor-table-sheet.component";
import { FloorTablesGrid } from "./components/floor-tables-grid.component";
import { parseFloorTableStatus } from "./helpers/floor-status.helpers";
import type { FloorOpsQuery, FloorTableState } from "./helpers/floor.types";
import { useFloorOpsActions } from "./helpers/use-floor-ops-actions.hook";

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
  const timeZone = activeRestaurant?.timezone ?? PLATFORM_TIMEZONE;

  const [selected, setSelected] = useState<FloorTableState | null>(null);
  const [selectedUnassignedId, setSelectedUnassignedId] = useState<
    string | null
  >(null);
  const [areaFilter, setAreaFilter] = useState(FLOOR_AREA_ALL);

  const { data, loading, error, refetch } = useQuery<FloorOpsQuery>(
    FLOOR_PLAN_OPS,
    {
      skip: !restaurantId,
      variables: { restaurantId },
      pollInterval: 10_000,
      fetchPolicy: "cache-and-network",
    },
  );

  const [seatAtTable] = useMutation(SEAT_RESERVATION_AT_TABLE);
  const [updateStatus] = useMutation(UPDATE_RESERVATION_STATUS);

  const clearSelection = useCallback(() => {
    setSelected(null);
    setSelectedUnassignedId(null);
  }, []);

  const { busy, refreshing, seatHere, changeStatus, onRefresh } =
    useFloorOpsActions({
      selected,
      selectedUnassignedId,
      seatAtTable,
      updateStatus,
      refetch,
      onClearSelection: clearSelection,
    });

  const tables = useMemo(
    () =>
      (data?.floorPlanOps?.tables ?? []).map((row) => ({
        ...row,
        status: parseFloorTableStatus(row.status),
      })),
    [data?.floorPlanOps?.tables],
  );
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

  const seatingMode = Boolean(selectedUnassigned);
  const selectedGuestLabel = selectedUnassigned
    ? guestDisplayName(selectedUnassigned.diner)
    : null;

  const bootstrapping = restaurantsLoading || !restaurantsReady;
  const isLoading =
    bootstrapping || (Boolean(restaurantId) && loading && !data);
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
          <FloorArrivingSection
            unassigned={unassigned}
            selectedUnassignedId={selectedUnassignedId}
            timeZone={timeZone}
            onSelect={setSelectedUnassignedId}
          />
          <FloorTablesGrid
            tables={tables}
            visibleTables={visibleTables}
            selectedTableId={selected?.table.id}
            seatingMode={seatingMode}
            onSelect={setSelected}
          />
        </ScrollView>
      )}

      <FloorTableSheet
        visible={Boolean(selected)}
        selected={selected}
        seatGuestName={selectedGuestLabel}
        timeZone={timeZone}
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

const styles = StyleSheet.create(({ space, colors }) => ({
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
}));
