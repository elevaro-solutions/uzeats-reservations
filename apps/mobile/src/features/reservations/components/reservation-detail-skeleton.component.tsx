import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Flex } from "@/components";
import { Skeleton } from "@/components/skeleton";

function DetailRowSkeleton({
  last = false,
  trailing,
}: {
  last?: boolean;
  trailing?: boolean;
}) {
  return (
    <Flex
      direction="row"
      alignItems="center"
      gap={1.5}
      style={[styles.row, !last && styles.rowBorder]}
    >
      <View style={styles.iconWell}>
        <Skeleton width={18} height={18} radius="sm" />
      </View>
      <Flex gap={0.25} style={styles.flexGrow}>
        <Skeleton width="28%" height={12} />
        {trailing ? (
          <View style={styles.statusTrailing}>
            <Skeleton width={72} height={22} radius="full" />
          </View>
        ) : (
          <Skeleton width="55%" height={16} />
        )}
      </Flex>
    </Flex>
  );
}

export function ReservationDetailSkeleton() {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  return (
    <View style={styles.root}>
      <Flex
        gap={2.5}
        style={[
          styles.body,
          {
            paddingBottom: Math.max(insets.bottom, theme.space(3)),
          },
        ]}
      >
        <View style={styles.cardShadow}>
          <View style={[styles.card, styles.restaurantCard]}>
            <Flex direction="row" gap={1.5} alignItems="center">
              <Skeleton width={64} height={64} radius="md" />
              <Flex gap={0.25} style={styles.flexGrow}>
                <Skeleton width="70%" height={18} />
                <Skeleton width="50%" height={14} />
              </Flex>
              <Skeleton width={20} height={20} radius="sm" />
            </Flex>
          </View>
        </View>

        <Flex gap={1.5}>
          <Flex
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            style={styles.sectionHeader}
          >
            <Skeleton width="30%" height={16} />
            <Skeleton width={88} height={36} radius="full" />
          </Flex>
          <View style={styles.cardShadow}>
            <View style={styles.card}>
              <DetailRowSkeleton trailing />
              <DetailRowSkeleton />
              <DetailRowSkeleton />
              <DetailRowSkeleton />
              <DetailRowSkeleton last />
            </View>
          </View>
        </Flex>

        <Flex gap={1.5}>
          <View style={styles.sectionHeader}>
            <Skeleton width="25%" height={16} />
          </View>
          <View style={styles.cardShadow}>
            <View style={styles.card}>
              <Flex
                direction="row"
                gap={1.5}
                alignItems="center"
                style={styles.row}
              >
                <Skeleton width={44} height={44} radius="md" />
                <Flex gap={0.25} style={styles.flexGrow}>
                  <Skeleton width="22%" height={12} />
                  <Skeleton width="48%" height={16} />
                </Flex>
              </Flex>
            </View>
          </View>
        </Flex>
      </Flex>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  root: {
    flex: 1,
  },
  body: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
  },
  sectionHeader: {
    paddingHorizontal: space(0.25),
  },
  cardShadow: {
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.slate3,
    overflow: "hidden",
  },
  restaurantCard: {
    padding: space(2),
  },
  row: {
    paddingHorizontal: space(2),
    paddingVertical: space(1.75),
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
  },
  iconWell: {
    width: space(5),
    height: space(5),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTrailing: {
    alignSelf: "flex-start",
    marginTop: space(0.25),
  },
  flexGrow: {
    flex: 1,
    minWidth: 0,
  },
}));
