import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

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

function ReservationCardSkeleton() {
  const { theme } = useUnistyles();

  return (
    <View style={styles.cardWrap}>
      <View style={styles.card}>
        <View style={styles.statusPill}>
          <Skeleton width={56} height={18} radius="full" />
        </View>

        <Flex direction="row" alignItems="center" gap={1.5}>
          <View style={styles.timeBlock}>
            <Skeleton width={36} height={22} radius="md" />
            <Skeleton width={24} height={10} radius="sm" />
          </View>

          <Flex flex={1} gap={0.5} style={styles.details}>
            <Skeleton width="65%" height={16} />
            <Flex direction="row" alignItems="center" gap={1}>
              <MetaCluster textWidth={52} />
              <MetaCluster textWidth={64} />
            </Flex>
          </Flex>
        </Flex>

        <Flex direction="row" alignItems="center" gap={1} style={styles.actions}>
          <View style={styles.primaryBtn}>
            <Skeleton
              width="100%"
              height={theme.space(5)}
              radius="md"
            />
          </View>
          <Skeleton width={40} height={40} radius="md" />
        </Flex>
      </View>
    </View>
  );
}

export function ReservationListSkeleton({ count = 4 }: { count?: number }) {
  const { theme } = useUnistyles();

  return (
    <Flex
      gap={0}
      style={[styles.list, { paddingTop: theme.space(1.5) }]}
    >
      {Array.from({ length: count }).map((_, index) => (
        <ReservationCardSkeleton key={index} />
      ))}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  list: {
    flex: 1,
  },
  cardWrap: {
    marginBottom: space(1.5),
    paddingHorizontal: space(2),
  },
  card: {
    position: "relative",
    padding: space(1.75),
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate3,
    gap: space(1.5),
  },
  statusPill: {
    position: "absolute",
    top: space(1.25),
    right: space(1.25),
    zIndex: 1,
  },
  timeBlock: {
    width: space(8),
    height: space(8),
    borderRadius: radius.md,
    backgroundColor: colors.slate1,
    borderWidth: 1,
    borderColor: colors.slate3,
    alignItems: "center",
    justifyContent: "center",
    gap: space(0.5),
    flexShrink: 0,
  },
  details: {
    minWidth: 0,
    paddingRight: space(7.5),
  },
  actions: {
    marginTop: space(0.25),
  },
  primaryBtn: {
    flex: 1,
  },
}));
