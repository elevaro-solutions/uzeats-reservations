import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex } from "@/components";
import { Skeleton } from "@/components/skeleton";

function MenuRowSkeleton() {
  return (
    <Flex direction="row" alignItems="center" gap={1.5} style={styles.menuRow}>
      <Skeleton width={20} height={20} radius="sm" />
      <Flex style={styles.grow}>
        <Skeleton width="45%" height={16} />
      </Flex>
      <Skeleton width={18} height={18} radius="sm" />
    </Flex>
  );
}

function MenuGroupSkeleton({ rows }: { rows: number }) {
  return (
    <View style={styles.group}>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <MenuRowSkeleton />
        </View>
      ))}
    </View>
  );
}

function MenuSectionSkeleton({ rows }: { rows: number }) {
  return (
    <Flex gap={1}>
      <View style={styles.sectionLabel}>
        <Skeleton width={72} height={12} />
      </View>
      <MenuGroupSkeleton rows={rows} />
    </Flex>
  );
}

export function ProfileSkeleton() {
  return (
    <>
      <Skeleton width={120} height={28} />

      <View style={styles.card}>
        <Flex direction="row" alignItems="center" gap={1.5}>
          <Skeleton width={56} height={56} radius="full" />
          <Flex gap={1} style={styles.grow}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="80%" height={14} />
          </Flex>
        </Flex>
      </View>

      <View style={styles.loyaltyCard}>
        <Flex gap={2} style={styles.loyaltyBody}>
          <Flex
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            gap={1}
          >
            <Skeleton width={72} height={16} />
            <Skeleton width={56} height={22} radius="full" />
          </Flex>

          <Flex direction="row" alignItems="center" gap={2}>
            <Flex direction="row" alignItems="center" gap={1} style={styles.grow}>
              <Skeleton width={36} height={36} radius="full" />
              <Skeleton width={64} height={20} />
            </Flex>
            <Flex direction="row" alignItems="center" gap={1} style={styles.grow}>
              <Skeleton width={36} height={36} radius="full" />
              <Skeleton width={56} height={20} />
            </Flex>
          </Flex>

          <View style={styles.divider} />

          <Flex gap={1}>
            <Skeleton width="100%" height={8} radius="full" />
            <Flex direction="row" justifyContent="space-between">
              <Skeleton width={48} height={12} />
              <Skeleton width={48} height={12} />
              <Skeleton width={48} height={12} />
            </Flex>
            <View style={styles.caption}>
              <Skeleton width={120} height={12} />
            </View>
          </Flex>
        </Flex>

        <Flex
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          style={styles.referral}
        >
          <Flex gap={0.5} style={styles.grow}>
            <Skeleton width={80} height={12} />
            <Skeleton width={96} height={14} />
          </Flex>
          <Skeleton width={56} height={16} />
        </Flex>
      </View>

      <MenuSectionSkeleton rows={3} />
      <MenuSectionSkeleton rows={1} />
      <MenuSectionSkeleton rows={3} />
      <MenuGroupSkeleton rows={1} />
    </>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  card: {
    padding: space(2),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.background,
  },
  loyaltyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  loyaltyBody: {
    padding: space(2.5),
  },
  referral: {
    paddingHorizontal: space(2.5),
    paddingVertical: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
  },
  group: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  menuRow: {
    paddingVertical: space(2),
    paddingHorizontal: space(2),
  },
  sectionLabel: {
    marginHorizontal: space(0.5),
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: colors.slate3,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
  caption: {
    alignSelf: "center",
  },
}));
