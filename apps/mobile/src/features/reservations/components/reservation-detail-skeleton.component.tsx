import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex } from "@/components";
import { Skeleton } from "@/components/skeleton";

export function ReservationDetailSkeleton() {
  return (
    <Flex gap={2.5} style={styles.body}>
      <View style={[styles.cardShadow, styles.restaurantShadow]}>
        <View style={[styles.card, styles.restaurantCard]}>
          <Flex direction="row" gap={1.5} alignItems="center">
            <Skeleton width={64} height={64} radius="md" />
            <Flex gap={0.5} style={styles.flexGrow}>
              <Skeleton width="70%" height={18} />
              <Skeleton width="50%" height={14} />
            </Flex>
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
          <Skeleton width={64} height={28} radius="full" />
        </Flex>
        <View style={styles.cardShadow}>
          <View style={styles.card}>
            {[0, 1, 2, 3].map((i) => (
              <Flex
                key={i}
                direction="row"
                gap={1.5}
                alignItems="center"
                style={styles.row}
              >
                <Skeleton width={32} height={32} radius="md" />
                <Flex gap={0.5} style={styles.flexGrow}>
                  <Skeleton width="28%" height={12} />
                  <Skeleton width="55%" height={16} />
                </Flex>
              </Flex>
            ))}
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
              <Flex gap={0.5} style={styles.flexGrow}>
                <Skeleton width="22%" height={12} />
                <Skeleton width="48%" height={16} />
              </Flex>
            </Flex>
          </View>
        </View>
      </Flex>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
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
    backgroundColor: colors.background,
    borderColor: colors.slate3,
  },
  restaurantShadow: {
    backgroundColor: colors.background,
  },
  row: {
    paddingHorizontal: space(2),
    paddingVertical: space(1.75),
  },
  flexGrow: {
    flex: 1,
  },
}));
