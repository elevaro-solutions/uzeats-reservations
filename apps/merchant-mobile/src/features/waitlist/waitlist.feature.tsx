import { useMutation, useQuery } from "@apollo/client";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ClipboardClockIcon, PlusIcon } from "@/assets";
import { Button, Empty, InlineAlert } from "@/components";
import { useActiveRestaurant } from "@/features/restaurants";

import {
  ADD_IN_HOUSE_WAITLIST,
  RESTAURANT_WAITLIST_FULL,
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
  runWaitlistStatusAction,
} from "./helpers/waitlist-actions.helpers";
import {
  isTerminalWaitlistStatus,
  type WaitlistAction,
} from "./helpers/waitlist-status.helpers";

type WaitlistQuery = {
  restaurantWaitlist: {
    total: number;
    items: WaitlistListItem[];
  };
};

export function WaitlistFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { activeRestaurantId, loading: restaurantsLoading } =
    useActiveRestaurant();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, refetch } = useQuery<WaitlistQuery>(
    RESTAURANT_WAITLIST_FULL,
    {
      skip: !activeRestaurantId,
      variables: { restaurantId: activeRestaurantId, limit: 50, offset: 0 },
      pollInterval: 15_000,
      fetchPolicy: "cache-and-network",
    },
  );

  const [addEntry, { loading: adding }] = useMutation(ADD_IN_HOUSE_WAITLIST);
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

  async function handleAction(id: string, action: WaitlistAction) {
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
      onSuccess: () => setSheetOpen(false),
    });
  }

  const isLoading = restaurantsLoading || (loading && !data);
  const isEmpty = !isLoading && items.length === 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <WaitlistHeader
        waitingCount={!isLoading && !isEmpty ? waitingCount : null}
        onBack={() => router.back()}
      />

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
                title="No one waiting"
                description="When walk-ins arrive without a reservation, add them below."
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

      {!isLoading ? (
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
            onPress={() => setSheetOpen(true)}
          >
            Add walk-in
          </Button>
        </View>
      ) : null}

      <AddWalkInSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        loading={adding}
        onSubmit={handleAdd}
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
