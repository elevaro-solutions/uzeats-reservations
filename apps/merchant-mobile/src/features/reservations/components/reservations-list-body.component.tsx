import { FlashList } from "@shopify/flash-list";
import { useCallback, useMemo } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PlusIcon } from "@/assets";
import { Button, Empty, Flex, Typography } from "@/components";
import type { GridColumns } from "@/lib/use-grid-columns";

import type { ReservationListItem } from "./reservation-card.component";
import { ReservationCard } from "./reservation-card.component";
import { ReservationListSkeleton } from "./reservation-list-skeleton.component";
import type { ReservationAction } from "../helpers/reservation-status.helpers";
import type { ListRow, RangeKey } from "../helpers/reservations-list.helpers";

export type ReservationsListBodyProps = {
  listRows: ListRow[];
  columns: GridColumns;
  range: RangeKey;
  timeZone?: string;
  showEmptyAdd: boolean;
  /** Tab has no cached rows yet — show skeleton instead of empty. */
  pending?: boolean;
  refreshing: boolean;
  updatingId: string | null;
  onRefresh: () => void;
  onOpenCreate: () => void;
  onOpenDetail: (id: string) => void;
  onAction: (
    reservation: ReservationListItem,
    action: ReservationAction,
  ) => void;
};

export function ReservationsListBody({
  listRows,
  columns,
  range,
  timeZone,
  showEmptyAdd,
  pending = false,
  refreshing,
  updatingId,
  onRefresh,
  onOpenCreate,
  onOpenDetail,
  onAction,
}: ReservationsListBodyProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  const contentContainerStyle = useMemo(
    () => ({
      paddingTop: theme.space(1.5),
      paddingBottom: insets.bottom + theme.space(12),
    }),
    [insets.bottom, theme],
  );

  const keyExtractor = useCallback((item: ListRow) => item.id, []);

  const getItemType = useCallback(
    (item: ListRow) => (item.type === "header" ? "sectionHeader" : "row"),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: ListRow }) => {
      if (item.type === "header") {
        return (
          <View style={styles.dayHeader}>
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

      const spacers = Math.max(0, columns - item.reservations.length);

      return (
        <Flex direction="row" gap={1.5} style={styles.cardRow}>
          {item.reservations.map((reservation) => (
            <View key={reservation.id} style={styles.cardCell}>
              <ReservationCard
                reservation={reservation}
                timeZone={timeZone}
                actionLoading={updatingId === reservation.id}
                onPress={() => onOpenDetail(reservation.id)}
                onAction={(action) => {
                  onAction(reservation, action);
                }}
              />
            </View>
          ))}
          {Array.from({ length: spacers }, (_, index) => (
            <View key={`spacer-${index}`} style={styles.cardCell} />
          ))}
        </Flex>
      );
    },
    [columns, onAction, onOpenDetail, timeZone, updatingId],
  );

  return (
    <>
      <FlashList
        data={pending ? [] : listRows}
        key={`reservations-${columns}`}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        contentContainerStyle={contentContainerStyle}
        extraData={`${updatingId}-${columns}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          pending ? (
            <ReservationListSkeleton count={4} />
          ) : (
            <View style={styles.emptyWrap}>
              <Empty
                title="No reservations"
                description={
                  range === "today"
                    ? "Nothing on the books for today."
                    : "No reservations in this range."
                }
              >
                {showEmptyAdd ? (
                  <Button
                    size="lg"
                    startIcon={<PlusIcon />}
                    onPress={onOpenCreate}
                  >
                    Add reservation
                  </Button>
                ) : null}
              </Empty>
            </View>
          )
        }
        renderItem={renderItem}
      />

      <Pressable
        onPress={onOpenCreate}
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
    </>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  dayHeader: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: space(1.25),
    paddingBottom: space(1.5),
    marginBottom: space(1.5),
    paddingHorizontal: space(2),
    backgroundColor: colors.background,
  },
  cardRow: {
    marginBottom: space(1.5),
    paddingHorizontal: space(2),
  },
  cardCell: {
    flex: 1,
    minWidth: 0,
  },
  emptyWrap: {
    paddingTop: space(4),
    paddingHorizontal: space(2),
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
    zIndex: 10,
    elevation: 6,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  fabPressed: {
    backgroundColor: colors.primaryPress,
    opacity: 0.92,
  },
}));
