import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Flex } from "@/components";
import { Skeleton } from "@/components/skeleton";

function DetailRowSkeleton({ last = false }: { last?: boolean }) {
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
        <Skeleton width="55%" height={16} />
      </Flex>
    </Flex>
  );
}

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <Flex gap={1}>
      <View style={styles.sectionTitle}>
        <Skeleton width={72} height={12} radius="sm" />
      </View>
      <View style={styles.sectionCard}>
        {Array.from({ length: rows }).map((_, index) => (
          <DetailRowSkeleton key={index} last={index === rows - 1} />
        ))}
      </View>
    </Flex>
  );
}

export function ReservationDetailSkeleton() {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  return (
    <View style={styles.root}>
      <Flex gap={2} style={styles.body}>
        <Flex gap={1.5} style={styles.hero}>
          <Flex
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            gap={1.5}
          >
            <Skeleton width="55%" height={24} />
            <Skeleton width={72} height={26} radius="full" />
          </Flex>

          <Flex direction="row" alignItems="flex-start" gap={1.5}>
            <View style={styles.timeBlock}>
              <Skeleton width={40} height={22} radius="md" />
              <Skeleton width={28} height={10} radius="sm" />
            </View>
            <Flex flex={1} gap={0.75}>
              <Flex gap={0.25}>
                <Skeleton width="40%" height={16} />
                <Skeleton width="60%" height={14} />
              </Flex>
              <Flex direction="row" alignItems="center" gap={1}>
                <Skeleton width={14} height={14} radius="sm" />
                <Skeleton width={64} height={12} />
                <Skeleton width={14} height={14} radius="sm" />
                <Skeleton width={80} height={12} />
              </Flex>
            </Flex>
          </Flex>
        </Flex>

        <SectionSkeleton rows={2} />
        <SectionSkeleton rows={3} />
        <SectionSkeleton rows={1} />
      </Flex>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, theme.space(2)) },
        ]}
      >
        <Flex direction="row" alignItems="center" gap={1}>
          <View style={styles.primaryBtn}>
            <Skeleton width="100%" height={theme.space(6)} radius="md" />
          </View>
          <Skeleton width={48} height={48} radius="md" />
        </Flex>
      </View>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius, shadows }) => ({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
    padding: space(2),
  },
  hero: {
    paddingBottom: space(0.5),
  },
  timeBlock: {
    width: space(9),
    height: space(9),
    paddingHorizontal: space(1),
    paddingVertical: space(0.75),
    borderRadius: radius.md,
    backgroundColor: colors.slate1,
    borderWidth: 1,
    borderColor: colors.slate3,
    alignItems: "center",
    justifyContent: "center",
    gap: space(0.5),
    flexShrink: 0,
  },
  sectionTitle: {
    paddingHorizontal: space(0.5),
  },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  row: {
    paddingVertical: space(1.25),
    paddingHorizontal: space(2),
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
    flexShrink: 0,
  },
  flexGrow: {
    flex: 1,
    minWidth: 0,
  },
  footer: {
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
    backgroundColor: colors.background,
    ...shadows.stickyFooter,
  },
  primaryBtn: {
    flex: 1,
  },
}));
