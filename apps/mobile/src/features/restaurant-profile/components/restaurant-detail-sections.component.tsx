import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Flex, Typography } from "@/components";

import {
  AccessibilityIcon,
  getAmenityDisplayLabel,
  getAmenityIcon,
} from "../helpers/restaurant-attribute-icons.helpers";
import { buildDetailSections } from "../helpers/restaurant-detail-sections.helpers";
import type { RestaurantDetail } from "../types";

import { DetailSection } from "./detail-section-header.component";

export type RestaurantDetailSectionsProps = {
  restaurant: RestaurantDetail;
};

/** Horizontal icon tiles — scan-friendly amenity strip that wraps. */
function AmenityList({ items }: { items: string[] }) {
  const { theme } = useUnistyles();

  return (
    <Flex direction="row" flexWrap="wrap" gap={1.5} style={styles.amenityRow}>
      {items.map((item) => {
        const Icon = getAmenityIcon(item);
        return (
          <Flex key={item} alignItems="center" gap={0.75} style={styles.amenityItem}>
            <Flex style={styles.iconCircle}>
              <Icon size={22} color={theme.colors.slate11} />
            </Flex>
            <Typography
              size="text-xs"
              weight="medium"
              color="secondary"
              style={styles.amenityLabel}
            >
              {getAmenityDisplayLabel(item)}
            </Typography>
          </Flex>
        );
      })}
    </Flex>
  );
}

/** Quiet icon row — dedicated accessibility callout. */
function AccessibilityCallout({ label }: { label: string }) {
  const { theme } = useUnistyles();

  return (
    <Flex direction="row" alignItems="center" gap={1.5}>
      <Flex style={styles.iconColumn}>
        <AccessibilityIcon size={18} color={theme.colors.slate10} />
      </Flex>
      <Typography size="text-sm" weight="regular" color="secondary">
        {label}
      </Typography>
    </Flex>
  );
}

export function RestaurantDetailSections({
  restaurant,
}: RestaurantDetailSectionsProps) {
  const sections = buildDetailSections(restaurant);

  return (
    <Flex gap={3.5}>
      {sections.map((section) => {
        if (section.type === "amenityList") {
          return (
            <DetailSection key={section.id} title={section.title}>
              <AmenityList items={section.items} />
            </DetailSection>
          );
        }

        return (
          <DetailSection key={section.id} title={section.title}>
            <AccessibilityCallout label={section.label} />
          </DetailSection>
        );
      })}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  amenityRow: {
    paddingTop: space(0.25),
  },
  amenityItem: {
    width: space(9),
  },
  iconCircle: {
    width: space(6),
    height: space(6),
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconColumn: {
    width: space(2.5),
    alignItems: "center",
    justifyContent: "center",
  },
  amenityLabel: {
    textAlign: "center",
    width: "100%",
  },
}));
