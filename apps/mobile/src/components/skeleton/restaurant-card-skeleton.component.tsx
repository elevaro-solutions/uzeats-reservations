import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex } from "../flex";

import { Skeleton } from "./skeleton.component";

export function RestaurantCardSkeleton() {
  return (
    <View style={styles.shadow}>
      <View style={styles.card}>
        <View style={styles.imageWrap}>
          <Skeleton width="100%" height={188} radius="md" />
          <View style={styles.favoriteBtn}>
            <Skeleton width={40} height={40} radius="full" />
          </View>
          <View style={styles.ratingBadge}>
            <Skeleton width={56} height={22} radius="full" />
          </View>
        </View>

        <Flex gap={1} style={styles.body}>
          <Skeleton height={18} width="65%" radius="md" />
          <Skeleton height={14} width="85%" radius="md" />
          <Flex direction="row" gap={1} style={styles.metaRow}>
            <Skeleton width={72} height={24} radius="full" />
            <Skeleton width={96} height={24} radius="full" />
          </Flex>
        </Flex>
      </View>
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors, shadows }) => ({
  shadow: {
    ...shadows.card,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    width: "100%",
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  imageWrap: {
    position: "relative",
    width: "100%",
    height: 188,
    backgroundColor: colors.surface,
  },
  favoriteBtn: {
    position: "absolute",
    top: space(1.25),
    right: space(1.25),
  },
  ratingBadge: {
    position: "absolute",
    right: space(1.25),
    bottom: space(1.25),
  },
  body: {
    paddingHorizontal: space(1.5),
    paddingTop: space(1.25),
    paddingBottom: space(2),
  },
  metaRow: {
    marginTop: space(0.25),
  },
}));
