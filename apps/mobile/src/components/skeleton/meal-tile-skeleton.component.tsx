import { StyleSheet } from "react-native-unistyles";

import { Flex } from "@/components";

import { Skeleton } from "./skeleton.component";

export function MealTileSkeleton() {
  return (
    <Flex style={styles.tile} alignItems="center" gap={1}>
      <Skeleton width={22} height={22} radius="full" />
      <Skeleton width={52} height={14} radius="md" />
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  tile: {
    minWidth: 88,
    paddingVertical: space(1.5),
    paddingHorizontal: space(1.5),
    borderRadius: radius.lg,
    backgroundColor: colors.slate2,
  },
}));
