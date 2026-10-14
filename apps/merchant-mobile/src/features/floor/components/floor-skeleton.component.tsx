import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex } from "@/components";
import { Skeleton } from "@/components/skeleton";

import { FloorStatusLegend } from "./floor-status-legend.component";

function UnassignedRowSkeleton() {
  return (
    <View style={styles.unassigned}>
      <Skeleton width="50%" height={16} />
      <Skeleton width="70%" height={14} />
    </View>
  );
}

export function FloorAreaPickerSkeleton() {
  return <Skeleton width={112} height={32} radius="full" />;
}

export function FloorSkeleton() {
  return (
    <Flex gap={3} style={styles.content}>
      <FloorStatusLegend />

      <Flex gap={1}>
        <Skeleton width={140} height={18} />
        <UnassignedRowSkeleton />
        <UnassignedRowSkeleton />
      </Flex>

      <View style={styles.toolbar}>
        <Skeleton width={96} height={18} />
        <Skeleton width={168} height={36} radius="md" />
      </View>
      <Skeleton width="100%" height={220} radius="lg" />
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  content: {
    flex: 1,
    paddingHorizontal: space(2.5),
  },
  unassigned: {
    minHeight: space(7.5),
    paddingVertical: space(1.5),
    paddingHorizontal: space(2),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    gap: space(0.5),
    justifyContent: "center",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space(1.5),
  },
}));
