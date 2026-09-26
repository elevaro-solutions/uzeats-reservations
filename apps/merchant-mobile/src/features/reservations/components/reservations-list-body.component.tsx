import { FlashList } from "@shopify/flash-list";
import { Pressable, RefreshControl, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PlusIcon } from "@/assets";
import { Button, Empty, Typography } from "@/components";

import type { ReservationListItem } from "./reservation-card.component";
import { ReservationCard } from "./reservation-card.component";
import type { ReservationAction } from "../helpers/reservation-status.helpers";
import type { ListRow, RangeKey } from "../helpers/reservations-list.helpers";

export type ReservationsListBodyProps = {
  listRows: ListRow[];
  range: RangeKey;
  timeZone?: string;
  showEmptyAdd: boolean;
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
  range,
  timeZone,
  showEmptyAdd,
  refreshing,
  updatingId,
  onRefresh,
  onOpenCreate,
  onOpenDetail,
  onAction,
}: ReservationsListBodyProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  return (
    <>
      <FlashList
        data={listRows}
        keyExtractor={(item) => item.id}
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
            onRefresh={onRefresh}
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
        }
        renderItem={({ item }) => {
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

          return (
            <View style={styles.cardWrap}>
              <ReservationCard
                reservation={item.reservation}
                timeZone={timeZone}
                actionLoading={updatingId === item.reservation.id}
                onPress={() => onOpenDetail(item.reservation.id)}
                onAction={(action) => {
                  onAction(item.reservation, action);
                }}
              />
            </View>
          );
        }}
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
    paddingVertical: space(1.25),
    paddingHorizontal: space(2),
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.secondarySubtle,
  },
  cardWrap: {
    marginBottom: space(1.5),
    paddingHorizontal: space(2),
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
