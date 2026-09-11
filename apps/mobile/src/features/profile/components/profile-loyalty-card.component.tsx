import { type ReactNode } from "react";
import { Pressable, Share, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import {
  AwardIcon,
  CheckIcon,
  FootprintsIcon,
  Share2Icon,
  SparklesIcon,
  StarIcon,
} from "@/assets";
import { Flex, Typography } from "@/components";
import { LOYALTY_TIERS, type LoyaltyTierId } from "@reservations/shared";

import {
  getLoyaltyTierColors,
  getLoyaltyTierProgress,
  getLoyaltyTrackFill01,
  type LoyaltyTierColors,
  type LoyaltyTierProgress,
} from "../helpers/loyalty-progress.helpers";

export type ProfileLoyaltyCardProps = {
  tierName?: string | null;
  points: number;
  completedVisits?: number | null;
  referralCode?: string | null;
};

const TIER_PILL_SIZE = 32;
const CURRENT_PILL_SIZE = 36;

/**
 * TEMP: force loyalty UI for color QA. Set to null to use real user data.
 * - "bronze" → 2 visits (between 0 and Silver)
 * - "silver" → 8 visits (between Silver and Gold)
 * - "gold" → 15 visits (max tier)
 */
const MOCK_LOYALTY_TIER: "bronze" | "silver" | "gold" | null = null;

const MOCK_LOYALTY_BY_TIER = {
  bronze: { points: 180, completedVisits: 2 },
  silver: { points: 720, completedVisits: 8 },
  gold: { points: 2100, completedVisits: 20 },
} as const;

function TierGlyph({
  tierId,
  color,
  size,
}: {
  tierId: LoyaltyTierId;
  color: string;
  size: number;
}) {
  if (tierId === "bronze") {
    return <AwardIcon size={size} color={color} />;
  }
  if (tierId === "silver") {
    return <StarIcon size={size} color={color} />;
  }
  return <SparklesIcon size={size} color={color} />;
}

function TierMarker({
  tierId,
  isCurrent,
  isPast,
  isLocked,
  palette,
}: {
  tierId: LoyaltyTierId;
  isCurrent: boolean;
  isPast: boolean;
  isLocked: boolean;
  palette: LoyaltyTierColors;
}) {
  const { theme } = useUnistyles();

  const backgroundColor =
    isCurrent || isPast ? palette.emphasis : theme.colors.slate3;

  const iconColor =
    isCurrent || isPast ? theme.colors.white : theme.colors.slate11;

  const borderColor = isCurrent
    ? theme.colors.white
    : isLocked
      ? theme.colors.slate5
      : "transparent";

  const borderWidth = isCurrent ? 2 : isLocked ? 1 : 0;

  return (
    <View
      style={[
        isCurrent ? styles.tierPillCurrent : styles.tierPill,
        {
          backgroundColor,
          borderColor,
          borderWidth,
        },
      ]}
    >
      {isPast ? (
        <CheckIcon size={16} color={iconColor} />
      ) : (
        <TierGlyph
          tierId={tierId}
          color={iconColor}
          size={isLocked ? 14 : 16}
        />
      )}
    </View>
  );
}

function TierProgressTrack({
  progress,
  palette,
}: {
  progress: LoyaltyTierProgress;
  palette: LoyaltyTierColors;
}) {
  const currentIndex = LOYALTY_TIERS.findIndex(
    (tier) => tier.id === progress.currentTier.id,
  );
  const fillPercent = Math.round(getLoyaltyTrackFill01(progress) * 100);

  const accessibilityLabel = `${progress.currentTier.name} tier. ${progress.caption}`;

  return (
    <View
      style={styles.trackRoot}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: fillPercent }}
    >
      <View style={styles.trackRow}>
        <View style={styles.trackBar}>
          <View
            style={[
              styles.trackFill,
              {
                width: `${Math.max(fillPercent, 4)}%`,
                backgroundColor: palette.emphasis,
              },
            ]}
          />
        </View>

        {LOYALTY_TIERS.map((tier, index) => {
          const isCurrent = index === currentIndex;
          const isPast = index < currentIndex;
          const isLocked = index > currentIndex;
          const positionStyle =
            index === 0
              ? styles.tierPillStart
              : index === LOYALTY_TIERS.length - 1
                ? styles.tierPillEnd
                : styles.tierPillMid;

          return (
            <View
              key={tier.id}
              style={[styles.tierPillSlot, positionStyle]}
              importantForAccessibility="no"
            >
              <TierMarker
                tierId={tier.id}
                isCurrent={isCurrent}
                isPast={isPast}
                isLocked={isLocked}
                palette={palette}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.labelsRow} importantForAccessibility="no">
        {LOYALTY_TIERS.map((tier, index) => {
          const isCurrent = index === currentIndex;
          const isLocked = index > currentIndex;
          const alignStyle =
            index === 0
              ? styles.labelColStart
              : index === LOYALTY_TIERS.length - 1
                ? styles.labelColEnd
                : styles.labelColMid;

          return (
            <View key={tier.id} style={[styles.labelCol, alignStyle]}>
              <Typography
                size="text-xs"
                weight={isCurrent ? "semibold" : "medium"}
                color={isLocked ? "muted" : undefined}
                style={isLocked ? undefined : { color: palette.icon }}
              >
                {tier.name}
              </Typography>
            </View>
          );
        })}
      </View>

      <Typography
        size="text-xs"
        color="muted"
        weight="regular"
        style={styles.caption}
        importantForAccessibility="no"
      >
        {progress.caption}
      </Typography>
    </View>
  );
}

function StatBadge({
  backgroundColor,
  children,
}: {
  backgroundColor: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.statBadge, { backgroundColor }]}>{children}</View>
  );
}

export function ProfileLoyaltyCard({
  points,
  completedVisits,
  referralCode,
}: ProfileLoyaltyCardProps) {
  const { theme } = useUnistyles();
  const mock = MOCK_LOYALTY_TIER
    ? MOCK_LOYALTY_BY_TIER[MOCK_LOYALTY_TIER]
    : null;
  const displayPoints = mock?.points ?? points;
  const displayVisits = mock?.completedVisits ?? completedVisits ?? 0;
  const progress = getLoyaltyTierProgress(displayVisits);
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
            <StatBadge backgroundColor={palette.soft}>
              <AwardIcon size={18} color={palette.icon} />
            </StatBadge>
            <Flex
              direction="row"
              alignItems="baseline"
              gap={0.5}
              style={styles.copy}
            >
              <Typography weight="bold" size="text-lg">
                {displayPoints.toLocaleString()}
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
            <StatBadge backgroundColor={theme.colors.slate3}>
              <FootprintsIcon size={18} color={theme.colors.slate11} />
            </StatBadge>
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

        <TierProgressTrack progress={progress} palette={palette} />
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
  trackRoot: {
    gap: space(0.75),
  },
  trackRow: {
    height: CURRENT_PILL_SIZE,
    justifyContent: "center",
  },
  trackBar: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.slate3,
    marginHorizontal: CURRENT_PILL_SIZE / 2,
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    borderRadius: radius.full,
    minWidth: 8,
  },
  tierPillSlot: {
    position: "absolute",
    top: 0,
    width: CURRENT_PILL_SIZE,
    height: CURRENT_PILL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  tierPill: {
    width: TIER_PILL_SIZE,
    height: TIER_PILL_SIZE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  tierPillCurrent: {
    width: CURRENT_PILL_SIZE,
    height: CURRENT_PILL_SIZE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  tierPillStart: {
    left: 0,
  },
  tierPillMid: {
    left: "50%",
    marginLeft: -CURRENT_PILL_SIZE / 2,
  },
  tierPillEnd: {
    right: 0,
  },
  labelsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  labelCol: {
    flex: 1,
  },
  labelColStart: {
    alignItems: "flex-start",
  },
  labelColMid: {
    alignItems: "center",
  },
  labelColEnd: {
    alignItems: "flex-end",
  },
  caption: {
    textAlign: "center",
  },
  statItem: {
    flex: 1,
    minWidth: 0,
  },
  statBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
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
