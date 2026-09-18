import { useMutation } from "@apollo/client";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { BellIcon, CheckIcon, ChevronLeftIcon } from "@/assets";
import {
  Button,
  Empty,
  Flex,
  IconButton,
  InlineAlert,
  Typography,
} from "@/components";
import { useAuth } from "@/graphql";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

import {
  MARK_ALL_NOTIFICATIONS_READ,
  MARK_NOTIFICATIONS_READ,
} from "./api/notifications.operations";
import { NotificationDetailSheet } from "./components/notification-detail-sheet.component";
import { NotificationListCard } from "./components/notification-list-card.component";
import type { NotificationLink } from "./helpers/notification-link.helpers";
import type { AppNotification } from "./helpers/notification.types";
import { useInfiniteNotifications } from "./hooks/use-infinite-notifications.hook";

export function NotificationsFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { user, loading: authLoading, sessionOffline, refreshMe } = useAuth();
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingSession, setRetryingSession] = useState(false);

  const {
    items,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    markItemsRead,
    markAllItemsRead,
  } = useInfiniteNotifications({ skip: !user });

  const [markRead] = useMutation(MARK_NOTIFICATIONS_READ);
  const [markAllRead, { loading: markingAll }] = useMutation(
    MARK_ALL_NOTIFICATIONS_READ,
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handlePress = useCallback(
    async (notification: AppNotification) => {
      const next = notification.readAt
        ? notification
        : { ...notification, readAt: new Date().toISOString() };
      setSelected(next);
      if (notification.readAt) return;

      markItemsRead([notification.id]);
      try {
        await markRead({ variables: { ids: [notification.id] } });
      } catch (err) {
        toast.error("Couldn't mark as read", {
          description: getGraphQLErrorMessage(err, "Please try again"),
        });
        void refresh();
      }
    },
    [markItemsRead, markRead, refresh],
  );

  const handleMarkAll = useCallback(async () => {
    if (unreadCount === 0 || markingAll) return;
    markAllItemsRead();
    try {
      await markAllRead();
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error("Couldn't mark all as read", {
        description: getGraphQLErrorMessage(err, "Please try again"),
      });
      void refresh();
    }
  }, [markAllItemsRead, markAllRead, markingAll, refresh, unreadCount]);

  const handleViewResource = useCallback(
    (link: NotificationLink) => {
      setSelected(null);
      router.push(link.href as never);
    },
    [router],
  );

  const isEmpty = !loading && !error && items.length === 0;

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
          Notifications
        </Typography>
        <IconButton
          icon={<CheckIcon />}
          variant="surface"
          size="sm"
          disabled={!user || unreadCount === 0 || markingAll}
          onPress={() => {
            void handleMarkAll();
          }}
          accessibilityLabel="Mark all as read"
          style={styles.chromeBtn}
          color={
            !user || unreadCount === 0
              ? theme.colors.textMuted
              : theme.colors.textPrimary
          }
        />
      </Flex>

      {sessionOffline && !user && !authLoading ? (
        <View style={styles.padX}>
          <Empty
            icon={<BellIcon size={28} color={theme.colors.textMuted} />}
            title="You're offline"
            description="We couldn't restore your session. Check your connection and try again."
          />
          <Button
            fullWidth
            loading={retryingSession}
            onPress={() => {
              setRetryingSession(true);
              void refreshMe().finally(() => setRetryingSession(false));
            }}
            style={styles.signInBtn}
          >
            Try again
          </Button>
        </View>
      ) : !user && !authLoading ? (
        <View style={styles.padX}>
          <Empty
            icon={<BellIcon size={28} color={theme.colors.textMuted} />}
            title="Sign in to see notifications"
            description="Floor alerts and reservation updates will show up here."
          />
          <Button
            fullWidth
            onPress={() => router.push("/(auth)/sign-in")}
            style={styles.signInBtn}
          >
            Sign in
          </Button>
        </View>
      ) : (
        <Flex flex={1}>
          {error ? (
            <View style={styles.padX}>
              <InlineAlert
                tone="error"
                title="Couldn't load notifications"
                message={error.message}
              />
              <Button
                fullWidth
                onPress={() => {
                  void onRefresh();
                }}
                style={styles.retryBtn}
              >
                Try again
              </Button>
            </View>
          ) : null}

          <FlashList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingTop: theme.space(1),
              paddingBottom:
                Math.max(insets.bottom, theme.space(2)) + theme.space(2),
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            onEndReached={() => {
              if (hasMore) loadMore();
            }}
            onEndReachedThreshold={0.4}
            refreshing={refreshing}
            onRefresh={() => {
              void onRefresh();
            }}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  color={theme.colors.primary}
                  style={styles.footerSpinner}
                />
              ) : null
            }
            ListEmptyComponent={
              loading || authLoading ? (
                <ActivityIndicator
                  color={theme.colors.primary}
                  style={styles.emptySpinner}
                />
              ) : isEmpty ? (
                <Empty
                  icon={<BellIcon size={28} color={theme.colors.textMuted} />}
                  title="No notifications yet"
                  description="Updates about reservations and the floor will appear here."
                />
              ) : null
            }
            renderItem={({ item }) => (
              <NotificationListCard
                notification={item}
                onPress={(n) => {
                  void handlePress(n);
                }}
              />
            )}
          />
        </Flex>
      )}

      <NotificationDetailSheet
        notification={selected}
        visible={Boolean(selected)}
        onClose={() => setSelected(null)}
        onViewResource={handleViewResource}
      />
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
  padX: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
  },
  signInBtn: {
    marginTop: space(2),
  },
  retryBtn: {
    marginTop: space(1.5),
  },
  separator: {
    height: 1,
    backgroundColor: colors.slate3,
    marginLeft: space(2) + space(5) + space(1.5),
  },
  footerSpinner: {
    marginVertical: space(2),
  },
  emptySpinner: {
    marginTop: space(6),
  },
}));
