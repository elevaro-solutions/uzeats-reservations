import { useMutation, useQuery } from "@apollo/client";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { ChevronLeftIcon, PlusIcon, UsersIcon } from "@/assets";
import {
  Button,
  Empty,
  Flex,
  IconButton,
  InlineAlert,
  Typography,
} from "@/components";
import { useActiveRestaurant } from "@/features/restaurants";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

import {
  ADD_IN_HOUSE_WAITLIST,
  RESTAURANT_WAITLIST_FULL,
  UPDATE_WAITLIST_STATUS,
} from "./api/waitlist.operations";
import {
  AddWalkInSheet,
  WaitlistCard,
  type WaitlistListItem,
} from "./components";
import { WaitlistListSkeleton } from "./components/waitlist-list-skeleton.component";
import type { AddWalkInPayload } from "./helpers/add-walk-in-schema.helpers";
import {
  isTerminalWaitlistStatus,
  waitlistActionToastCopy,
  type WaitlistAction,
} from "./helpers/waitlist-status.helpers";

type WaitlistEntry = WaitlistListItem;

type WaitlistQuery = {
  restaurantWaitlist: {
    total: number;
    items: WaitlistEntry[];
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

  async function handleAction(id: string, action: WaitlistAction) {
    const copy = waitlistActionToastCopy(action);
    setBusyId(id);
    try {
      await updateStatus({ variables: { id, status: action.status } });
      toast.success(copy.success);
      await refetch();
    } catch (err) {
      toast.error(copy.error, {
        description: getGraphQLErrorMessage(err, "Please try again"),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdd(values: AddWalkInPayload) {
    if (!activeRestaurantId) {
      toast.error("Select a restaurant first");
      return;
    }
    try {
      await addEntry({
        variables: {
          input: {
            restaurantId: activeRestaurantId,
            guestName: values.guestName,
            guestPhone: values.guestPhone,
            partySize: values.partySize,
            quotedWaitMinutes: values.quotedWaitMinutes,
          },
        },
      });
      toast.success("Walk-in added");
      setSheetOpen(false);
      await refetch();
    } catch (err) {
      toast.error("Couldn't add walk-in", {
        description: getGraphQLErrorMessage(err, "Please try again"),
      });
    }
  }

  const isLoading = restaurantsLoading || (loading && !data);
  const isEmpty = !isLoading && items.length === 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Flex direction="column" style={styles.topBar}>
        <Flex direction="row" alignItems="center">
          <IconButton
            icon={<ChevronLeftIcon />}
            variant="surface"
            size="sm"
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            style={styles.chromeBtn}
          />
          <Typography weight="semibold" size="text-lg" style={styles.topTitle}>
            Waitlist
          </Typography>
          <View style={styles.chromeBtn} />
        </Flex>
        {!isLoading && !isEmpty ? (
          <Typography
            size="text-sm"
            color="muted"
            style={styles.queueSummary}
          >
            {waitingCount === 1
              ? "1 waiting"
              : `${waitingCount} waiting`}
          </Typography>
        ) : null}
      </Flex>

      {error ? (
        <View style={styles.pad}>
          <InlineAlert tone="error" message={error.message} />
        </View>
      ) : null}

      {isLoading ? (
        <WaitlistListSkeleton count={4} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingHorizontal: theme.space(2),
              paddingTop: theme.space(2),
              paddingBottom: theme.space(3),
              gap: theme.space(1.5),
            },
            isEmpty ? styles.listEmpty : null,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Empty
                icon={<UsersIcon />}
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

const styles = StyleSheet.create(({ space, colors, radius, shadows }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
    gap: space(0.25),
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
  },
  queueSummary: {
    textAlign: "center",
  },
  chromeBtn: {
    width: space(5),
    height: space(5),
    borderRadius: radius.full,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  listEmpty: {
    justifyContent: "center",
  },
  emptyWrap: {
    paddingHorizontal: space(2),
    paddingVertical: space(2),
  },
  pad: {
    paddingHorizontal: space(2),
  },
  footer: {
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
    backgroundColor: colors.background,
    ...shadows.stickyFooter,
  },
}));
