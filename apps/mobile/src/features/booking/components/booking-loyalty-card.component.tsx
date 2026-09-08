import { useState } from "react";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronRightIcon, SparklesIcon, StarIcon } from "@/assets";
import { Chip, Flex, Typography } from "@/components";
import { maxRedeemPointsForDeposit } from "@reservations/shared";

import { formatCents } from "../helpers/booking-pricing.helpers";

export type BookingLoyaltyCardProps = {
  title: string;
  variant: "platform" | "restaurant";
  balance: number;
  minRedeem: number;
  value: number;
  depositHeadroomCents: number;
  discountCentsFor: (points: number) => number;
  onChange: (value: number) => void;
  onHowItWorks: () => void;
  style?: StyleProp<ViewStyle>;
};

export function BookingLoyaltyCard({
  title,
  variant,
  balance,
  minRedeem,
  value,
  depositHeadroomCents,
  discountCentsFor,
  onChange,
  onHowItWorks,
  style,
}: BookingLoyaltyCardProps) {
  const { theme } = useUnistyles();
  const [showRedeemOptions, setShowRedeemOptions] = useState(value > 0);

  const canRedeem = balance >= minRedeem && depositHeadroomCents > 0;
  const maxByDeposit = maxRedeemPointsForDeposit(depositHeadroomCents);
  const maxRedeemable = Math.min(balance, maxByDeposit);
  const selectedDiscount = value > 0 ? discountCentsFor(value) : 0;
  const balanceWorthCents = discountCentsFor(balance);
  const progressPercent = Math.min(
    100,
    Math.round((balance / Math.max(minRedeem, 1)) * 100),
  );
  const remainingToUnlock = Math.max(0, minRedeem - balance);

  const presets = canRedeem
    ? [0, minRedeem, minRedeem * 2].filter(
        (preset) => preset === 0 || preset <= maxRedeemable,
      )
    : [];

  if (canRedeem && maxRedeemable > 0 && !presets.includes(maxRedeemable)) {
    const floored = Math.floor(maxRedeemable / minRedeem) * minRedeem;
    if (floored >= minRedeem && !presets.includes(floored)) {
      presets.push(floored);
    }
  }

  const Icon = variant === "platform" ? SparklesIcon : StarIcon;
  const revealRedeem = canRedeem && (showRedeemOptions || value > 0);

  return (
    <View style={[styles.card, style]}>
      <Flex gap={1}>
        <Flex
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
        >
          <Flex
            direction="row"
            alignItems="center"
            gap={1}
            style={styles.headerLeft}
          >
            <Icon size={18} color={theme.colors.accent} />
            <Typography size="text-md" weight="bold" numberOfLines={1}>
              {title}
            </Typography>
          </Flex>
          <Pressable
            onPress={onHowItWorks}
            accessibilityRole="button"
            accessibilityLabel="How points work"
            hitSlop={8}
            style={styles.headerLink}
          >
            <Typography size="text-sm" weight="medium" style={styles.accentText}>
              How it works
            </Typography>
            <ChevronRightIcon size={16} color={theme.colors.accent11} />
          </Pressable>
        </Flex>

        <Typography size="text-sm" color="secondary">
          Worth {formatCents(balanceWorthCents)} toward deposits
        </Typography>
      </Flex>

      <Flex gap={1.5} style={styles.balanceSection}>
        <Flex
          direction="row"
          alignItems="flex-end"
          justifyContent="space-between"
          gap={1.5}
        >
          <Flex direction="row" alignItems="baseline" gap={0.5}>
            <Typography size="display-xs" weight="bold">
              {balance.toLocaleString()}
            </Typography>
            <Typography size="text-sm" weight="regular" color="secondary">
              pts
            </Typography>
          </Flex>
          <Typography
            size="text-xs"
            color="secondary"
            align="right"
            style={styles.statusText}
          >
            {canRedeem ? (
              <>
                Ready to{" "}
                <Typography size="text-xs" weight="bold">
                  redeem
                </Typography>
                {selectedDiscount > 0
                  ? ` · −${formatCents(selectedDiscount)}`
                  : ""}
              </>
            ) : remainingToUnlock > 0 ? (
              <>
                {remainingToUnlock.toLocaleString()} points to{" "}
                <Typography size="text-xs" weight="bold">
                  unlock
                </Typography>
              </>
            ) : (
              "Keep earning on bookings"
            )}
          </Typography>
        </Flex>

        <View style={styles.progressTrack}>
          <LinearGradient
            colors={[theme.colors.accent10, theme.colors.accent4]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[
              styles.progressFill,
              { width: `${canRedeem ? 100 : Math.max(progressPercent, 4)}%` },
            ]}
          />
        </View>
      </Flex>

      <Flex gap={2} style={styles.actionsSection}>
        <Flex direction="row" gap={1.5}>
          <Pressable
            onPress={onHowItWorks}
            accessibilityRole="button"
            accessibilityLabel="How to earn points"
            style={({ pressed }) => [
              styles.pill,
              styles.pillOutlined,
              pressed && styles.pillPressed,
            ]}
          >
            <Typography size="text-sm" weight="semibold">
              How to earn
            </Typography>
          </Pressable>
          <Pressable
            onPress={() => {
              if (!canRedeem) return;
              setShowRedeemOptions(true);
              if (value === 0 && minRedeem <= maxRedeemable) {
                onChange(minRedeem);
              }
            }}
            disabled={!canRedeem}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canRedeem }}
            accessibilityLabel="Apply points to deposit"
            style={({ pressed }) => [
              styles.pill,
              canRedeem ? styles.pillAccent : styles.pillDisabled,
              pressed && canRedeem && styles.pillPressed,
            ]}
          >
            <Typography
              size="text-sm"
              weight="semibold"
              color={canRedeem ? "inverse" : "muted"}
            >
              {canRedeem ? "Apply points" : "Redeem locked"}
            </Typography>
          </Pressable>
        </Flex>

        {revealRedeem ? (
          <Flex gap={1.25}>
            <Typography size="text-xs" weight="medium" color="secondary">
              Apply to this deposit
            </Typography>
            <Flex direction="row" gap={1} flexWrap="wrap">
              {presets.map((preset) => {
                const discount = preset === 0 ? 0 : discountCentsFor(preset);
                const label =
                  preset === 0
                    ? "None"
                    : `${preset.toLocaleString()} (−${formatCents(discount)})`;
                return (
                  <Chip
                    key={preset}
                    size="sm"
                    selected={value === preset}
                    onPress={() => onChange(preset)}
                  >
                    {label}
                  </Chip>
                );
              })}
            </Flex>
          </Flex>
        ) : null}
      </Flex>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  card: {
    gap: space(2.5),
    padding: space(3),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate4,
    backgroundColor: colors.background,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  headerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(0.25),
  },
  accentText: {
    color: colors.accent11,
  },
  balanceSection: {
    paddingTop: space(0.5),
  },
  statusText: {
    flexShrink: 1,
    maxWidth: "48%",
    paddingBottom: space(0.5),
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.slate3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
    minWidth: 8,
  },
  actionsSection: {
    paddingTop: space(0.5),
  },
  pill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space(1.5),
    paddingHorizontal: space(1.5),
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  pillOutlined: {
    backgroundColor: colors.background,
    borderColor: colors.slate4,
  },
  pillAccent: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pillDisabled: {
    backgroundColor: colors.slate2,
    borderColor: colors.slate3,
  },
  pillPressed: {
    opacity: 0.88,
  },
}));
