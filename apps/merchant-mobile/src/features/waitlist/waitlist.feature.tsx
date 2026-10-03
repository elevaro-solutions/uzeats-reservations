import { useMutation, useQuery } from "@apollo/client";
import { restaurantTimeZone, todayIsoInTimeZone } from "@reservations/shared";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ClipboardClockIcon, PlusIcon } from "@/assets";
import { Button, Empty, InlineAlert, SegmentedControl } from "@/components";
import { useActiveRestaurant } from "@/features/restaurants";

import {
  ADD_IN_HOUSE_WAITLIST,
  RESTAURANT_WAITLIST_FULL,
  UPDATE_WAITLIST_ENTRY,
  UPDATE_WAITLIST_STATUS,
} from "./api/waitlist.operations";
import {
  AddWalkInSheet,
  WaitlistCard,
  WaitlistHeader,
  WaitlistListSkeleton,
  type WaitlistListItem,
} from "./components";
import type { AddWalkInPayload } from "./helpers/add-walk-in-schema.helpers";
import {
  runAddWalkIn,
  runUpdateWaitlistEntry,
  runWaitlistStatusAction,
} from "./helpers/waitlist-actions.helpers";
import {
  entryDisplayName,
  entryPhone,
  isTerminalWaitlistStatus,
  type WaitlistAction,
} from "./helpers/waitlist-status.helpers";

type WaitlistQuery = {
  restaurantWaitlist: {
    total: number;
    items: WaitlistListItem[];
  };
};

type QueueTab = "active" | "history";

const ACTIVE_STATUSES = ["waiting", "notified"];
const HISTORY_STATUSES = ["seated", "booked", "expired", "cancelled"];

export function WaitlistFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const {
    activeRestaurantId,
    activeRestaurant,
    loading: restaurantsLoading,
  } = useActiveRestaurant();
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | null>(null);
  const [editingEntry, setEditingEntry] = useState<WaitlistListItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [queueTab, setQueueTab] = useState<QueueTab>("active");

  const todayIso = useMemo(() => {
    const tz = restaurantTimeZone(activeRestaurant ?? {});
    return todayIsoInTimeZone(tz);
  }, [activeRestaurant]);

  const statuses = queueTab === "active" ? ACTIVE_STATUSES : HISTORY_STATUSES;

  const { data, loading, error, refetch } = useQuery<WaitlistQuery>(
    RESTAURANT_WAITLIST_FULL,
    {
      skip: !activeRestaurantId,
      variables: {
        restaurantId: activeRestaurantId,
        limit: 50,
        offset: 0,
        statuses,
        // History is day-scoped; live queue includes future online joins.
        preferredDate: queueTab === "history" ? todayIso : undefined,
      },
      pollInterval: 15_000,
      fetchPolicy: "cache-and-network",
    },
  );

  const [addEntry, { loading: adding }] = useMutation(ADD_IN_HOUSE_WAITLIST);
  const [updateEntry, { loading: updating }] = useMutation(UPDATE_WAITLIST_ENTRY);
  const [updateStatus] = useMutation(UPDATE_WAITLIST_STATUS);

  const items = useMemo(() => data?.restaurantWaitlist?.items ?? [], [data]);
  const waitingCount = useMemo(
    () => items.filter((item) => !isTerminalWaitlistStatus(item.status)).length,
    [items],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  function closeSheet() {
    setSheetMode(null);
    setEditingEntry(null);
  }

  async function handleAction(id: string, action: WaitlistAction) {
    if (action.action === "edit") {
      const entry = items.find((item) => item.id === id) ?? null;
      setEditingEntry(entry);
      setSheetMode("edit");
      return;
    }
    await runWaitlistStatusAction({
      id,
      action,
      updateStatus,
      refetch,
      setBusyId,
    });
  }

  async function handleAdd(values: AddWalkInPayload) {
    await runAddWalkIn({
      restaurantId: activeRestaurantId,
      values,
      addEntry,
      refetch,
      onSuccess: closeSheet,
    });
  }

  async function handleEdit(values: AddWalkInPayload) {
    if (!editingEntry) return;
    const hadDiner = Boolean(editingEntry.dinerId);
    const clearDinerId = hadDiner && !values.dinerId;
    await runUpdateWaitlistEntry({
      id: editingEntry.id,
      values,
      clearDinerId,
      updateEntry,
      refetch,
      onSuccess: closeSheet,
    });
  }

  const isLoading = restaurantsLoading || (loading && !data);
  const isEmpty = !isLoading && items.length === 0;
  const sheetOpen = sheetMode != null;
  const sheetLoading = sheetMode === "edit" ? updating : adding;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <WaitlistHeader
        waitingCount={
          !isLoading && !isEmpty && queueTab === "active" ? waitingCount : null
        }
        onBack={() => router.back()}
      />

      <View style={styles.pad}>
        <SegmentedControl<QueueTab>
          value={queueTab}
          onChange={setQueueTab}
          options={[
            { value: "active", label: "Live" },
            { value: "history", label: "History" },
          ]}
        />
      </View>

      {error ? (
        <View style={styles.pad}>
          <InlineAlert tone="error" message={error.message} />
        </View>
      ) : null}

      {isLoading ? (
        <WaitlistListSkeleton count={4} />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: theme.space(2),
            paddingTop: theme.space(2),
            paddingBottom: theme.space(3),
            ...(isEmpty ? { flexGrow: 1 } : null),
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
                icon={<ClipboardClockIcon />}
                title={queueTab === "active" ? "No one waiting" : "No history today"}
                description={
                  queueTab === "active"
                    ? "When walk-ins arrive without a reservation, add them below."
                    : "Seated, booked, and cancelled parties from today show here."
                }
              />
            </View>
          }
          renderItem={({ item }) => (
            <WaitlistCard
              entry={item}
              actionLoading={busyId === item.id}
              onAction={(action) => {
                void handleAction(item.id, action);
              }}
            />
          )}
        />
      )}

      {!isLoading && queueTab === "active" ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, theme.space(2)) },
          ]}
        >
          <Button
            fullWidth
            size="xl"
            startIcon={<PlusIcon />}
            onPress={() => {
              setEditingEntry(null);
              setSheetMode("add");
            }}
          >
            Add walk-in
          </Button>
        </View>
      ) : null}

      <AddWalkInSheet
        visible={sheetOpen}
        mode={sheetMode === "edit" ? "edit" : "add"}
        restaurantId={activeRestaurantId}
        initialValues={
          sheetMode === "edit" && editingEntry
            ? {
                dinerId: editingEntry.dinerId,
                guestName: entryDisplayName(editingEntry),
                guestPhone: entryPhone(editingEntry),
                partySize: editingEntry.partySize,
                quotedWaitMinutes: editingEntry.quotedWaitMinutes,
              }
            : null
        }
        onClose={closeSheet}
        loading={sheetLoading}
        onSubmit={sheetMode === "edit" ? handleEdit : handleAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, shadows }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  separator: {
    height: space(1.5),
  },
  emptyWrap: {
    paddingHorizontal: space(2),
    paddingVertical: space(2),
    flexGrow: 1,
    justifyContent: "center",
  },
  pad: {
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
  },
  footer: {
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.secondarySubtle,
    backgroundColor: colors.background,
    ...shadows.stickyFooter,
  },
}));
