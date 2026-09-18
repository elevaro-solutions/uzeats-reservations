import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import {
  AwardIcon,
  CheckIcon,
  SparklesIcon,
  StarIcon,
} from "@/assets";
import { Typography } from "@/components";
import { LOYALTY_TIERS, type LoyaltyTierId } from "@reservations/shared";

import {
  getLoyaltyTrackFill01,
  type LoyaltyTierColors,
  type LoyaltyTierProgress,
} from "../helpers/loyalty-progress.helpers";

const TIER_PILL_SIZE = 32;
const CURRENT_PILL_SIZE = 36;

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

export function LoyaltyTierProgressTrack({
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

const styles = StyleSheet.create(({ space, colors, radius }) => ({
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
}));
