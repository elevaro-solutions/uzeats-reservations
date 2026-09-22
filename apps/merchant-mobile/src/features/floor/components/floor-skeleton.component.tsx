import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex } from "@/components";
import { Skeleton } from "@/components/skeleton";

import { floorTableWidth } from "../helpers/floor-table-size.helpers";
import { FloorStatusLegend } from "./floor-status-legend.component";

function UnassignedRowSkeleton() {
  return (
    <View style={styles.unassigned}>
      <Skeleton width="50%" height={16} />
      <Skeleton width="70%" height={14} />
    </View>
  );
}

function FloorTileSkeleton() {
  return (
    <View style={styles.tile}>
      <View style={styles.tabletop}>
        <Skeleton width={48} height={14} radius="sm" />
        <Skeleton width={36} height={10} radius="sm" />
      </View>
    </View>
  );
}

export function FloorAreaPickerSkeleton() {
  return <Skeleton width={112} height={32} radius="full" />;
}

export function FloorSkeleton({ tileCount = 6 }: { tileCount?: number }) {
  return (
    <Flex gap={3} style={styles.content}>
      <FloorStatusLegend />

      <Flex gap={1}>
        <Skeleton width={140} height={18} />
        <UnassignedRowSkeleton />
        <UnassignedRowSkeleton />
      </Flex>

      <View style={styles.grid}>
        {Array.from({ length: tileCount }).map((_, index) => (
          <FloorTileSkeleton key={index} />
        ))}
      </View>
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space(2),
    justifyContent: "space-between",
    paddingVertical: space(0.5),
  },
  tile: {
    width: floorTableWidth("four"),
    minHeight: space(14),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: space(1.25),
    alignItems: "center",
    justifyContent: "center",
  },
  tabletop: {
    width: "70%",
    minHeight: space(7),
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.secondarySubtle,
    alignItems: "center",
    justifyContent: "center",
    gap: space(0.5),
    paddingVertical: space(1),
  },
}));
