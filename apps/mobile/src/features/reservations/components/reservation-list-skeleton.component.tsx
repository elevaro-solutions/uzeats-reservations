import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex } from "@/components";
import { Skeleton } from "@/components/skeleton";

function MetaCluster({ textWidth }: { textWidth: number }) {
  return (
    <Flex direction="row" alignItems="center" gap={0.5}>
      <Skeleton width={14} height={14} radius="sm" />
      <Skeleton width={textWidth} height={12} radius="md" />
    </Flex>
  );
}

export function ReservationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Flex gap={0} style={styles.wrap}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.shadow}>
          <View style={styles.card}>
            <Flex gap={1.5}>
              <Flex direction="row" gap={1.5} alignItems="center">
                <Skeleton width={48} height={48} radius="md" />
                <Flex gap={0.25} style={styles.grow}>
                  <Skeleton width="70%" height={16} />
                  <Skeleton width="45%" height={12} />
                </Flex>
                <Skeleton width={64} height={22} radius="full" />
              </Flex>

              <View style={styles.metaWell}>
                <Flex
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <MetaCluster textWidth={56} />
                  <MetaCluster textWidth={48} />
                  <MetaCluster textWidth={20} />
                </Flex>
              </View>
            </Flex>
          </View>
        </View>
      ))}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  wrap: {
    paddingHorizontal: space(2),
  },
  shadow: {
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    shadowColor: colors.slate12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: space(1.5),
  },
  card: {
    padding: space(1.5),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  metaWell: {
    paddingHorizontal: space(1.5),
    paddingVertical: space(1),
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  grow: {
    flex: 1,
  },
}));
