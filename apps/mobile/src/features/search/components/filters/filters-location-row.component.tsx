import { Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronDownIcon, MapPinIcon } from "@/assets";
import { Flex, Typography } from "@/components";

export type FiltersLocationRowProps = {
  locationLabel: string;
  onPress: () => void;
};

export function FiltersLocationRow({
  locationLabel,
  onPress,
}: FiltersLocationRowProps) {
  const { theme } = useUnistyles();

  return (
    <Pressable
      onPress={onPress}
      style={styles.locationRow}
      accessibilityRole="button"
      accessibilityLabel="Change search location"
    >
      <Flex gap={0.5} flex={1}>
        <Typography size="text-xs" color="secondary">
          Location
        </Typography>
        <Flex
          direction="row"
          alignItems="center"
          gap={1}
          style={styles.locationValueRow}
        >
          <MapPinIcon size={18} color={theme.colors.primary} />
          <Flex
            direction="row"
            alignItems="center"
            gap={0.25}
            style={styles.locationAddressRow}
          >
            <Typography
              weight="semibold"
              numberOfLines={1}
              style={styles.locationValue}
            >
              {locationLabel}
            </Typography>
            <ChevronDownIcon size={16} color={theme.colors.textMuted} />
          </Flex>
        </Flex>
      </Flex>
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  locationRow: {
    paddingVertical: space(0.5),
  },
  locationValueRow: {
    flexShrink: 1,
    minWidth: 0,
  },
  locationAddressRow: {
    flexShrink: 1,
    minWidth: 0,
  },
  locationValue: {
    flexShrink: 1,
    minWidth: 0,
  },
}));
