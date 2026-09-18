import { useMutation, useQuery } from "@apollo/client";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { ChevronLeftIcon } from "@/assets";
import {
  BottomSheet,
  Button,
  Empty,
  Flex,
  IconButton,
  InlineAlert,
  Input,
  Loader,
  Typography,
} from "@/components";
import { useActiveRestaurant } from "@/features/restaurants";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

import {
  ADD_IN_HOUSE_WAITLIST,
  RESTAURANT_WAITLIST_FULL,
  UPDATE_WAITLIST_STATUS,
} from "./api/waitlist.operations";

type WaitlistEntry = {
  id: string;
  partySize: number;
  status: string;
  guestName?: string | null;
  guestPhone?: string | null;
  quotedWaitMinutes?: number | null;
  position?: number | null;
  estimatedWaitMinutes?: number | null;
  diner?: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  } | null;
};

type WaitlistQuery = {
  restaurantWaitlist: {
    total: number;
    items: WaitlistEntry[];
  };
};

function entryName(entry: WaitlistEntry): string {
  if (entry.guestName) return entry.guestName;
  const name = [entry.diner?.firstName, entry.diner?.lastName]
    .filter(Boolean)
    .join(" ");
  return name || "Guest";
}

export function WaitlistFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { activeRestaurantId, loading: restaurantsLoading } =
    useActiveRestaurant();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [quotedWait, setQuotedWait] = useState("15");
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

  async function handleStatus(id: string, status: string) {
    setBusyId(id);
    try {
      await updateStatus({ variables: { id, status } });
      toast.success(`Marked ${status}`);
      await refetch();
    } catch (err) {
      toast.error("Couldn't update waitlist", {
        description: getGraphQLErrorMessage(err, "Please try again"),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdd() {
    if (!activeRestaurantId) return;
    const size = Number.parseInt(partySize, 10);
    const wait = Number.parseInt(quotedWait, 10);
    if (!guestName.trim() || !Number.isFinite(size) || size < 1) {
      toast.error("Enter a name and party size");
      return;
    }
    try {
      await addEntry({
        variables: {
          input: {
            restaurantId: activeRestaurantId,
            guestName: guestName.trim(),
            guestPhone: guestPhone.trim() || undefined,
            partySize: size,
            quotedWaitMinutes: Number.isFinite(wait) ? wait : undefined,
          },
        },
      });
      toast.success("Walk-in added");
      setSheetOpen(false);
      setGuestName("");
      setGuestPhone("");
      setPartySize("2");
      setQuotedWait("15");
      await refetch();
    } catch (err) {
      toast.error("Couldn't add walk-in", {
        description: getGraphQLErrorMessage(err, "Please try again"),
      });
    }
  }

  const isLoading = restaurantsLoading || (loading && !data);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Flex direction="row" alignItems="center" style={styles.topBar}>
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

      <View style={styles.addWrap}>
        <Button fullWidth size="xl" onPress={() => setSheetOpen(true)}>
          Add walk-in
        </Button>
      </View>

      {error ? (
        <View style={styles.pad}>
          <InlineAlert tone="error" message={error.message} />
        </View>
      ) : null}

      {isLoading ? (
        <Loader fullScreen />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: theme.space(2),
            paddingBottom: insets.bottom + theme.space(3),
            gap: theme.space(1.5),
          }}
          ListEmptyComponent={
            <Empty
              title="Waitlist is empty"
              description="Add a walk-in when guests arrive without a reservation."
            />
          }
          renderItem={({ item }) => {
            const terminal = ["seated", "cancelled", "expired", "booked"].includes(
              item.status,
            );
            return (
              <View style={styles.card}>
                <Typography weight="semibold" size="text-lg">
                  {entryName(item)}
                </Typography>
                <Typography size="text-md" color="secondary">
                  Party of {item.partySize}
                  {item.position != null && item.status === "waiting"
                    ? ` · #${item.position}`
                    : ""}
                  {item.estimatedWaitMinutes != null
                    ? ` · ~${item.estimatedWaitMinutes} min`
                    : item.quotedWaitMinutes != null
                      ? ` · quoted ${item.quotedWaitMinutes} min`
                      : ""}
                </Typography>
                <Typography size="text-sm" color="muted">
                  {item.status}
                </Typography>
                {!terminal ? (
                  <Flex direction="row" gap={1} style={styles.actions}>
                    {item.status === "waiting" ? (
                      <Button
                        size="lg"
                        variant="outlined"
                        loading={busyId === item.id}
                        onPress={() => {
                          void handleStatus(item.id, "notified");
                        }}
                        style={styles.actionBtn}
                      >
                        Notify
                      </Button>
                    ) : null}
                    <Button
                      size="lg"
                      loading={busyId === item.id}
                      onPress={() => {
                        void handleStatus(item.id, "seated");
                      }}
                      style={styles.actionBtn}
                    >
                      Seat
                    </Button>
                    <Button
                      size="lg"
                      color="error"
                      variant="outlined"
                      loading={busyId === item.id}
                      onPress={() => {
                        void handleStatus(item.id, "cancelled");
                      }}
                      style={styles.actionBtn}
                    >
                      Remove
                    </Button>
                  </Flex>
                ) : null}
              </View>
            );
          }}
        />
      )}

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Add walk-in"
        showHandle
        headerBorder
        keyboardAvoiding
        scrollable
        footer={
          <Button
            fullWidth
            size="xl"
            loading={adding}
            onPress={() => {
              void handleAdd();
            }}
          >
            Add to waitlist
          </Button>
        }
      >
        <Flex gap={2}>
          <Input
            label="Guest name"
            required
            value={guestName}
            onChangeText={setGuestName}
            placeholder="Name"
            autoCapitalize="words"
          />
          <Input
            label="Phone"
            value={guestPhone}
            onChangeText={setGuestPhone}
            placeholder="Optional"
            keyboardType="phone-pad"
          />
          <Input
            label="Party size"
            required
            value={partySize}
            onChangeText={setPartySize}
            keyboardType="number-pad"
          />
          <Input
            label="Quoted wait (min)"
            value={quotedWait}
            onChangeText={setQuotedWait}
            keyboardType="number-pad"
          />
        </Flex>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
  },
  chromeBtn: {
    width: space(5),
    height: space(5),
    borderRadius: radius.full,
  },
  addWrap: {
    padding: space(2),
  },
  pad: {
    paddingHorizontal: space(2),
  },
  card: {
    padding: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.slate2,
    gap: space(0.75),
  },
  actions: {
    marginTop: space(1),
    flexWrap: "wrap",
  },
  actionBtn: {
    flexGrow: 1,
    minWidth: "30%",
  },
}));
