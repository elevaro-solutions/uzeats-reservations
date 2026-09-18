import { Pressable, Share, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { AwardIcon, FootprintsIcon, Share2Icon } from "@/assets";
import { Flex, Typography } from "@/components";

import {
  getLoyaltyTierColors,
  getLoyaltyTierProgress,
} from "../helpers/loyalty-progress.helpers";
import { LoyaltyStatBadge } from "./loyalty-stat-badge.component";
import { LoyaltyTierProgressTrack } from "./loyalty-tier-progress-track.component";

export type ProfileLoyaltyCardProps = {
  tierName?: string | null;
  points: number;
  completedVisits?: number | null;
  referralCode?: string | null;
};

export function ProfileLoyaltyCard({
  points,
  completedVisits,
  referralCode,
}: ProfileLoyaltyCardProps) {
  const { theme } = useUnistyles();
  const progress = getLoyaltyTierProgress(completedVisits ?? 0);
  const palette = getLoyaltyTierColors(progress.currentTier.id);
  const visits = progress.completedVisits;

  async function shareReferral() {
    if (!referralCode) return;
    await Share.share({
      message: `Join Tablevera with my referral code: ${referralCode}`,
    });
  }

  return (
    <View style={styles.card}>
      <Flex gap={2} style={styles.body}>
        <Flex
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
        >
          <Typography weight="bold" size="text-md" style={styles.copy}>
            Loyalty
          </Typography>
          <View style={[styles.tierChip, { backgroundColor: palette.soft }]}>
            <Typography
              size="text-xs"
              weight="semibold"
              style={{ color: palette.icon }}
            >
              {progress.currentTier.name}
            </Typography>
          </View>
        </Flex>

        <Flex direction="row" alignItems="flex-start" gap={2}>
          <Flex
            direction="row"
            alignItems="center"
            gap={1}
            style={styles.statItem}
          >
            <LoyaltyStatBadge backgroundColor={palette.soft}>
              <AwardIcon size={18} color={palette.icon} />
            </LoyaltyStatBadge>
            <Flex
              direction="row"
              alignItems="baseline"
              gap={0.5}
              style={styles.copy}
            >
              <Typography weight="bold" size="text-lg">
                {points.toLocaleString()}
              </Typography>
              <Typography size="text-sm" color="muted" weight="regular">
                pts
              </Typography>
            </Flex>
          </Flex>

          <Flex
            direction="row"
            alignItems="center"
            gap={1}
            style={styles.statItem}
          >
            <LoyaltyStatBadge backgroundColor={theme.colors.slate3}>
              <FootprintsIcon size={18} color={theme.colors.slate11} />
            </LoyaltyStatBadge>
            <Flex
              direction="row"
              alignItems="baseline"
              gap={0.5}
              style={styles.copy}
            >
              <Typography weight="bold" size="text-lg">
                {visits.toLocaleString()}
              </Typography>
              <Typography size="text-sm" color="muted" weight="regular">
                visits
              </Typography>
            </Flex>
          </Flex>
        </Flex>

        <View style={styles.sectionDivider} />

        <LoyaltyTierProgressTrack progress={progress} palette={palette} />
      </Flex>

      {referralCode ? (
        <Flex
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          style={styles.referral}
        >
          <Flex gap={0.25} style={styles.copy}>
            <Typography size="text-xs" color="muted">
              Referral code
            </Typography>
            <Typography weight="semibold" size="text-sm">
              {referralCode}
            </Typography>
          </Flex>
          <Pressable
            onPress={() => void shareReferral()}
            accessibilityRole="button"
            accessibilityLabel="Share referral code"
            hitSlop={8}
            style={styles.shareLink}
          >
            <Share2Icon size={16} color={theme.colors.primary} />
            <Typography
              size="text-sm"
              weight="medium"
              style={{ color: theme.colors.primary }}
            >
              Share
            </Typography>
          </Pressable>
        </Flex>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.background,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    overflow: "hidden",
  },
  body: {
    padding: space(2.5),
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.slate3,
    marginHorizontal: -space(2.5),
  },
  tierChip: {
    paddingHorizontal: space(1),
    paddingVertical: space(0.5),
    borderRadius: radius.full,
  },
  statItem: {
    flex: 1,
    minWidth: 0,
  },
  copy: {
    minWidth: 0,
  },
  referral: {
    paddingHorizontal: space(2.5),
    paddingVertical: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
  },
  shareLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(0.5),
  },
}));
