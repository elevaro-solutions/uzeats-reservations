import { useState } from "react";
import { Linking, Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronDownIcon, MapPinIcon, StarIcon } from "@/assets";
import { Flex, Typography } from "@/components";
import {
  formatFullAddress,
  formatPriceRangeLabel,
  formatShortHours,
} from "@/features/discovery";

import { formatOpeningHoursLines } from "../helpers/opening-hours.helpers";
import { buildMapsSearchUrl } from "../helpers/restaurant-links.helpers";
import type { RestaurantDetail } from "../types";

export type RestaurantMetaProps = {
  restaurant: RestaurantDetail;
};

export function RestaurantMeta({ restaurant }: RestaurantMetaProps) {
  const { theme } = useUnistyles();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const shortHours = formatShortHours(restaurant.shifts);
  const scheduleLines = formatOpeningHoursLines(restaurant.shifts ?? []);
  const addressLabel = formatFullAddress(restaurant.address);
  const mapsUrl = buildMapsSearchUrl(restaurant.address, restaurant.location);

  async function openMaps() {
    try {
      await Linking.openURL(mapsUrl);
    } catch {
      // Ignore link failures
    }
  }

  return (
    <Flex gap={1.5}>
      {restaurant.featured ? (
        <Typography
          size="text-xs"
          weight="medium"
          color="primary"
          style={styles.badge}
        >
          Featured
        </Typography>
      ) : null}

      <Typography size="display-xs" weight="bold">
        {restaurant.name}
      </Typography>

      <Flex direction="row" alignItems="center" gap={1} flexWrap="wrap">
        <Flex direction="row" alignItems="center" gap={0.5}>
          <StarIcon size={16} color={theme.colors.accent} />
          <Typography size="text-sm" weight="semibold">
            {restaurant.averageRating > 0
              ? restaurant.averageRating.toFixed(1)
              : "New"}
          </Typography>
          {restaurant.reviewCount > 0 ? (
            <Typography size="text-sm" color="secondary">
              ({restaurant.reviewCount})
            </Typography>
          ) : null}
        </Flex>
        <Typography size="text-sm" color="muted">
          ·
        </Typography>
        <Typography color="secondary" size="text-sm">
          {restaurant.cuisine}
          {" · "}
          {formatPriceRangeLabel(restaurant.priceRange)}
        </Typography>
      </Flex>

      <Pressable onPress={openMaps} accessibilityRole="link">
        <Flex direction="row" alignItems="flex-start" gap={1}>
          <MapPinIcon size={18} color={theme.colors.primary} />
          <Typography size="text-sm" color="secondary" style={styles.flex1}>
            {addressLabel}
          </Typography>
        </Flex>
      </Pressable>

      {shortHours || scheduleLines.length > 0 ? (
        <Flex style={styles.hoursBox} gap={1}>
          <Pressable
            onPress={() =>
              scheduleLines.length > 0 && setScheduleOpen((v) => !v)
            }
            disabled={scheduleLines.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Opening schedule"
          >
            <Flex
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              gap={1}
            >
              <Typography size="text-sm" style={styles.hoursLabel}>
                Hours{shortHours ? `: ${shortHours}` : ""}
              </Typography>
              {scheduleLines.length > 0 ? (
                <Flex
                  direction="row"
                  alignItems="center"
                  gap={0.5}
                  style={styles.scheduleCluster}
                >
                  <Typography size="text-sm" weight="medium" color="primary">
                    Schedule
                  </Typography>
                  <ChevronDownIcon
                    size={16}
                    color={theme.colors.primary}
                    style={scheduleOpen ? styles.chevronOpen : undefined}
                  />
                </Flex>
              ) : null}
            </Flex>
          </Pressable>
          {scheduleOpen
            ? scheduleLines.map((line) => (
                <Typography key={line} size="text-sm" color="secondary">
                  {line}
                </Typography>
              ))
            : null}
        </Flex>
      ) : null}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: space(1),
    paddingVertical: space(0.5),
    borderRadius: radius.full,
    backgroundColor: colors.primarySubtle,
    overflow: "hidden",
  },
  flex1: {
    flex: 1,
  },
  hoursLabel: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  scheduleCluster: {
    flexShrink: 0,
  },
  hoursBox: {
    padding: space(1.5),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  chevronOpen: {
    transform: [{ rotate: "180deg" }],
  },
}));
