import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex } from "@/components";
import { Skeleton } from "@/components/skeleton";

function NotificationRowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={40} height={40} radius="md" />
      <Flex flex={1} gap={0.5} style={styles.body}>
        <Flex direction="row" alignItems="center" gap={0.75}>
          <Skeleton width="55%" height={16} />
          <View style={styles.time}>
            <Skeleton width={36} height={12} radius="sm" />
          </View>
        </Flex>
        <Skeleton width="92%" height={14} />
        <Skeleton width="70%" height={14} />
      </Flex>
    </View>
  );
}

export function NotificationListSkeleton({ count = 7 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index}>
          <NotificationRowSkeleton />
          {index < count - 1 ? <View style={styles.separator} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  list: {
    flex: 1,
    paddingTop: space(1),
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space(1.5),
    paddingVertical: space(2),
    paddingHorizontal: space(2),
    minHeight: space(8),
  },
  body: {
    minWidth: 0,
  },
  time: {
    marginLeft: "auto",
  },
  separator: {
    height: 1,
    backgroundColor: colors.slate3,
    marginLeft: space(2) + space(5) + space(1.5),
  },
}));
