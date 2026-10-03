import { useMutation, useQuery } from "@apollo/client";
import { formatUsDate } from "@reservations/shared";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { ChevronLeftIcon, ClockIcon } from "@/assets";
import {
  Button,
  Empty,
  Flex,
  IconButton,
  InlineAlert,
  Typography,
} from "@/components";
import { Skeleton } from "@/components/skeleton";
import { useAuth } from "@/graphql";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

import { CANCEL_WAITLIST, MY_WAITLIST } from "./api/waitlist.operations";
import {
  canBookFromWaitlist,
  canCancelWaitlist,
  waitlistStatusVisual,
} from "./helpers/waitlist-display.helpers";

type WaitlistEntry = {
  id: string;
  restaurantId: string;
  partySize: number;
  preferredDate: string;
  preferredTimeStart?: string | null;
  preferredTimeEnd?: string | null;
  status: string;
  notifiedSlot?: string | null;
  position?: number | null;
  estimatedWaitMinutes?: number | null;
  restaurant?: {
    id: string;
    name?: string | null;
    timezone?: string | null;
  } | null;
};

type MyWaitlistQuery = {
  myWaitlist: WaitlistEntry[];
};

export function WaitlistFeature() {
  const { user, loading: authLoading, sessionOffline, refreshMe } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [retryingSession, setRetryingSession] = useState(false);

  const { data, loading, error, refetch } = useQuery<MyWaitlistQuery>(MY_WAITLIST, {
    skip: !user,
    pollInterval: 15_000,
    fetchPolicy: "cache-and-network",
  });

  const [cancelWaitlist] = useMutation(CANCEL_WAITLIST);

  const entries = data?.myWaitlist ?? [];
  const isLoading = authLoading || (loading && !data);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  function handleCancel(entry: WaitlistEntry) {
    Alert.alert(
      "Leave waitlist?",
      "You will lose your spot and need to rejoin if you change your mind.",
      [
        { text: "Keep spot", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setBusyId(entry.id);
              try {
                await cancelWaitlist({ variables: { id: entry.id } });
                toast.success("Left the waitlist");
                await refetch();
              } catch (err) {
                toast.error(getGraphQLErrorMessage(err, "Couldn't leave waitlist"));
              } finally {
                setBusyId(null);
              }
            })();
          },
        },
      ],
    );
  }

  function handleBook(entry: WaitlistEntry) {
    const params: Record<string, string> = {
      date: entry.preferredDate,
      party: String(entry.partySize),
    };
    if (entry.notifiedSlot) params.slot = entry.notifiedSlot;
    router.push({
      pathname: `/restaurant/${entry.restaurantId}/book`,
      params,
    });
  }

  if (!authLoading && !user) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <WaitlistChrome onBack={() => router.back()} />
        <View style={styles.emptyWrap}>
          <Empty
            icon={<ClockIcon />}
            title="Sign in to see your waitlist"
            description="Join a waitlist when a restaurant is fully booked, then track it here."
          >
            <Button
              onPress={() =>
                router.push({
                  pathname: "/sign-in",
                  params: { next: "/waitlist" },
                })
              }
            >
              Sign in
            </Button>
          </Empty>
        </View>
      </View>
    );
  }

  if (sessionOffline && !user) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <WaitlistChrome onBack={() => router.back()} />
        <View style={styles.pad}>
          <InlineAlert
            tone="warning"
            message="You're offline. Try again when you have a connection."
          />
          <Button
            style={{ marginTop: theme.space(2) }}
            loading={retryingSession}
            onPress={() => {
              setRetryingSession(true);
              void refreshMe().finally(() => setRetryingSession(false));
            }}
          >
            Try again
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <WaitlistChrome onBack={() => router.back()} />

      {error ? (
        <View style={styles.pad}>
          <InlineAlert tone="error" message={error.message} />
        </View>
      ) : null}

      {isLoading ? (
        <Flex gap={1.5} style={styles.pad}>
          <Skeleton height={96} />
          <Skeleton height={96} />
          <Skeleton height={96} />
        </Flex>
      ) : (
        <FlashList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: theme.space(2),
            paddingTop: theme.space(2),
            paddingBottom: Math.max(insets.bottom, theme.space(3)),
            ...(entries.length === 0 ? { flexGrow: 1 } : null),
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
                icon={<ClockIcon />}
                title="You're not on any waitlists"
                description="When a restaurant is fully booked, join the waitlist and we'll alert you if a table frees up."
              >
                <Button onPress={() => router.push("/search")}>
                  Find restaurants
                </Button>
              </Empty>
            </View>
          }
          renderItem={({ item }) => {
            const visual = waitlistStatusVisual(item.status);
            const name = item.restaurant?.name ?? "Restaurant";
            const timeLabel =
              item.preferredTimeStart && item.preferredTimeEnd
                ? `${item.preferredTimeStart}–${item.preferredTimeEnd}`
                : item.preferredTimeStart ?? null;
            return (
              <View style={styles.card}>
                <Flex direction="row" justifyContent="space-between" gap={1}>
                  <Typography weight="semibold" size="text-md" style={{ flex: 1 }}>
                    {name}
                  </Typography>
                  <Typography size="text-xs" color="secondary">
                    {visual.label}
                  </Typography>
                </Flex>
                <Typography size="text-sm" color="secondary" style={styles.meta}>
                  {formatPreferredDate(item.preferredDate)}
                  {timeLabel ? ` · ${timeLabel}` : ""}
                  {` · ${item.partySize} ${item.partySize === 1 ? "guest" : "guests"}`}
                </Typography>
                {item.status === "waiting" && item.position != null ? (
                  <Typography size="text-sm" weight="medium" style={styles.meta}>
                    You are #{item.position}
                    {item.estimatedWaitMinutes != null
                      ? ` · ~${item.estimatedWaitMinutes} min`
                      : ""}
                  </Typography>
                ) : null}
                <Flex direction="row" gap={1} style={styles.actions}>
                  {canBookFromWaitlist(item.status) ? (
                    <Button
                      size="sm"
                      onPress={() => handleBook(item)}
                      style={{ flex: 1 }}
                    >
                      Book now
                    </Button>
                  ) : null}
                  {canCancelWaitlist(item.status) ? (
                    <Button
                      size="sm"
                      variant="outlined"
                      loading={busyId === item.id}
                      onPress={() => handleCancel(item)}
                      style={{ flex: 1 }}
                    >
                      Leave
                    </Button>
                  ) : null}
                </Flex>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function formatPreferredDate(dateIso: string): string {
  const [year, month, day] = dateIso.split("-").map(Number);
  if (!year || !month || !day) return dateIso;
  return formatUsDate(new Date(year, month - 1, day), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function WaitlistChrome({ onBack }: { onBack: () => void }) {
  return (
    <Flex direction="row" alignItems="center" style={styles.topBar}>
      <IconButton
        icon={<ChevronLeftIcon />}
        variant="surface"
        size="sm"
        onPress={onBack}
        accessibilityLabel="Go back"
      />
      <Typography weight="semibold" size="text-lg" style={styles.topTitle}>
        My waitlist
      </Typography>
      <View style={styles.chromeSpacer} />
    </Flex>
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
    borderBottomColor: colors.secondarySubtle,
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
  },
  chromeSpacer: {
    width: space(5),
    height: space(5),
  },
  pad: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
  },
  separator: {
    height: space(1.5),
  },
  emptyWrap: {
    paddingHorizontal: space(2),
    flexGrow: 1,
    justifyContent: "center",
  },
  card: {
    borderWidth: 1,
    borderColor: colors.secondarySubtle,
    borderRadius: radius.md,
    padding: space(2),
    backgroundColor: colors.background,
    gap: space(0.5),
  },
  meta: {
    marginTop: space(0.25),
  },
  actions: {
    marginTop: space(1.5),
  },
}));
