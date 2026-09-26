import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex } from "@/components";
import { Skeleton } from "@/components/skeleton";

function SnapshotCardBone() {
  return (
    <View style={styles.cardWrap}>
      <Flex gap={1} style={styles.card}>
        <Skeleton width={22} height={22} radius="sm" />
        <Skeleton width={40} height={28} radius="md" />
        <Skeleton width={64} height={14} radius="sm" />
      </Flex>
    </View>
  );
}

function ShortcutBone() {
  return (
    <View style={styles.shortcut}>
      <Flex direction="row" alignItems="center" justifyContent="space-between">
        <Flex direction="row" alignItems="center" gap={1.5}>
          <Skeleton width={22} height={22} radius="sm" />
          <Skeleton width={96} height={16} radius="md" />
        </Flex>
        <Skeleton width={18} height={18} radius="sm" />
      </Flex>
    </View>
  );
}

export function OverviewSkeleton() {
  return (
    <Flex gap={1} style={styles.content}>
      <View style={styles.sectionTitle}>
        <Skeleton width={72} height={28} radius="md" />
      </View>

      <View style={styles.snapshotGrid}>
        <SnapshotCardBone />
        <SnapshotCardBone />
        <SnapshotCardBone />
        <SnapshotCardBone />
      </View>

      <View style={styles.shortcutsTitle}>
        <Skeleton width={96} height={20} radius="md" />
      </View>

      <Flex gap={1.5}>
        <ShortcutBone />
        <ShortcutBone />
        <ShortcutBone />
        <ShortcutBone />
      </Flex>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  content: {
    flex: 1,
    paddingHorizontal: space(2),
    paddingTop: space(2.5),
  },
  sectionTitle: {
    marginBottom: space(1),
  },
  snapshotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space(1.5),
  },
  cardWrap: {
    width: "47%",
    flexGrow: 1,
  },
  card: {
    padding: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    minHeight: space(14),
  },
  shortcutsTitle: {
    marginTop: space(2.5),
    marginBottom: space(1),
  },
  shortcut: {
    minHeight: space(7),
    paddingHorizontal: space(2),
    paddingVertical: space(1.75),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
}));
