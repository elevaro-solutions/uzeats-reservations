import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex } from "@/components";
import { Skeleton } from "@/components/skeleton";

export function ReservationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Flex gap={1.5} style={styles.wrap}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.card}>
          <Flex direction="row" gap={1.5} alignItems="center">
            <Skeleton width={48} height={48} radius="md" />
            <Flex gap={1} style={styles.grow}>
              <Skeleton width="70%" height={16} />
              <Skeleton width="45%" height={12} />
            </Flex>
            <Skeleton width={64} height={22} radius="full" />
          </Flex>
          <Skeleton width="100%" height={36} radius="sm" />
        </View>
      ))}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  wrap: {
    paddingHorizontal: space(2),
  },
  card: {
    gap: space(1.5),
    padding: space(1.5),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.background,
  },
  grow: {
    flex: 1,
  },
}));
