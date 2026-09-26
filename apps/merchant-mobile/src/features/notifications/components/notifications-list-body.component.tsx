import { FlashList } from "@shopify/flash-list";
import { ActivityIndicator, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { BellIcon } from "@/assets";
import { Button, Empty, Flex, InlineAlert } from "@/components";

import type { AppNotification } from "../helpers/notification.types";
import { NotificationListCard } from "./notification-list-card.component";
import { NotificationListSkeleton } from "./notification-list-skeleton.component";

export type NotificationsListBodyProps = {
  items: AppNotification[];
  loading: boolean;
  authLoading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  errorMessage?: string | null;
  isEmpty: boolean;
  refreshing: boolean;
  contentPaddingBottom: number;
  onRefresh: () => void;
  onLoadMore: () => void;
  onPressItem: (notification: AppNotification) => void;
  onRetry: () => void;
};

export function NotificationsListBody({
  items,
  loading,
  authLoading,
  loadingMore,
  hasMore,
  errorMessage,
  isEmpty,
  refreshing,
  contentPaddingBottom,
  onRefresh,
  onLoadMore,
  onPressItem,
  onRetry,
}: NotificationsListBodyProps) {
  const { theme } = useUnistyles();

  return (
    <Flex flex={1}>
      {errorMessage ? (
        <View style={styles.padX}>
          <InlineAlert
            tone="error"
            title="Couldn't load notifications"
            message={errorMessage}
          />
          <Button fullWidth onPress={onRetry} style={styles.retryBtn}>
            Try again
          </Button>
        </View>
      ) : null}

      <FlashList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: theme.space(1),
          paddingBottom: contentPaddingBottom,
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={() => {
          if (hasMore) onLoadMore();
        }}
        onEndReachedThreshold={0.4}
        refreshing={refreshing}
        onRefresh={onRefresh}
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
            <NotificationListSkeleton count={7} />
          ) : isEmpty ? (
            <Empty
              icon={<BellIcon size={28} color={theme.colors.textMuted} />}
              title="No notifications yet"
              description="Updates about reservations and the floor will appear here."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <NotificationListCard notification={item} onPress={onPressItem} />
        )}
      />
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  padX: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
  },
  retryBtn: {
    marginTop: space(1.5),
  },
  separator: {
    height: 1,
    backgroundColor: colors.secondarySubtle,
    marginLeft: space(2) + space(5) + space(1.5),
  },
  footerSpinner: {
    marginVertical: space(2),
  },
}));
