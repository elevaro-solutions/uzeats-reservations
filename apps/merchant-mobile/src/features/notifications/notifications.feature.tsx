import { useMutation } from "@apollo/client";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { CheckIcon, ChevronLeftIcon } from "@/assets";
import { Flex, IconButton, Typography } from "@/components";
import {
  syncActiveRestaurantId,
  useActiveRestaurant,
} from "@/features/restaurants";
import { useAuth } from "@/graphql";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

import {
  MARK_ALL_NOTIFICATIONS_READ,
  MARK_NOTIFICATIONS_READ,
} from "./api/notifications.operations";
import { NotificationDetailSheet } from "./components/notification-detail-sheet.component";
import { NotificationsAuthGate } from "./components/notifications-auth-gate.component";
import { NotificationsListBody } from "./components/notifications-list-body.component";
import {
  parseNotificationData,
  type NotificationLink,
} from "./helpers/notification-link.helpers";
import type { AppNotification } from "./helpers/notification.types";
import { useInfiniteNotifications } from "./hooks/use-infinite-notifications.hook";

export function NotificationsFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { restaurants } = useActiveRestaurant();
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
      if (selected) {
        const data = parseNotificationData(selected.data);
        const restaurantId =
          typeof data.restaurantId === "string" && data.restaurantId.length > 0
            ? data.restaurantId
            : null;
        syncActiveRestaurantId(restaurantId, { restaurants });
      }
      setSelected(null);
      router.push(link.href as never);
    },
    [router, selected, restaurants],
  );

  const showAuthGate = !user && !authLoading;
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

      {showAuthGate ? (
        <NotificationsAuthGate
          mode={sessionOffline ? "offline" : "signed-out"}
          retryingSession={retryingSession}
          onRetrySession={() => {
            setRetryingSession(true);
            void refreshMe().finally(() => setRetryingSession(false));
          }}
          onSignIn={() => router.push("/(auth)/sign-in")}
        />
      ) : (
        <NotificationsListBody
          items={items}
          loading={loading}
          authLoading={authLoading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          errorMessage={error?.message}
          isEmpty={isEmpty}
          refreshing={refreshing}
          contentPaddingBottom={
            Math.max(insets.bottom, theme.space(2)) + theme.space(2)
          }
          onRefresh={() => {
            void onRefresh();
          }}
          onLoadMore={loadMore}
          onPressItem={(n) => {
            void handlePress(n);
          }}
          onRetry={() => {
            void onRefresh();
          }}
        />
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
    borderBottomColor: colors.secondarySubtle,
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
}));
