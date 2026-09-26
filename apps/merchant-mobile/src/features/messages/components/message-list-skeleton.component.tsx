import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex } from "@/components";
import { Skeleton } from "@/components/skeleton";

function MessageRowSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={40} height={40} radius="full" />
      {/* Bones lack Typography line-height, so use a wider gap than the live
          row's gap={0.25} to match the visual spacing between title + preview. */}
      <Flex flex={1} gap={0.75} style={styles.body}>
        <Flex direction="row" alignItems="center" gap={1}>
          <Skeleton width="45%" height={16} />
          <View style={styles.time}>
            <Skeleton width={40} height={12} radius="sm" />
          </View>
        </Flex>
        <Skeleton width="85%" height={14} />
        <Skeleton width="55%" height={12} />
      </Flex>
    </View>
  );
}

export function MessageListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Flex gap={1} style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <MessageRowSkeleton key={index} />
      ))}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  list: {
    flex: 1,
    paddingHorizontal: space(2),
    paddingTop: space(1),
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space(1.5),
    padding: space(1.75),
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.secondarySubtle,
  },
  body: {
    minWidth: 0,
  },
  time: {
    marginLeft: "auto",
  },
}));
