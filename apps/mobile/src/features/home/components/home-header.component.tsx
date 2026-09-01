import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronDownIcon, MapPinIcon, SearchIcon } from "@/assets";
import { Flex, InlineAlert, Typography } from "@/components";

export type HomeHeaderProps = {
  locationLabel: string;
  errorMessage?: string | null;
  onLocationPress: () => void;
  onSearchPress: () => void;
};

export function HomeHeader({
  locationLabel,
  errorMessage,
  onLocationPress,
  onSearchPress,
}: HomeHeaderProps) {
  const { theme } = useUnistyles();

  return (
    <>
      <Flex gap={2.5} style={styles.padX}>
        <Pressable
          onPress={onLocationPress}
          style={styles.locationRow}
          accessibilityRole="button"
          accessibilityLabel="Change location"
        >
          <MapPinIcon size={18} color={theme.colors.primary} />
          <Typography
            weight="semibold"
            numberOfLines={1}
            style={styles.locationLabel}
          >
            {locationLabel}
          </Typography>
          <ChevronDownIcon size={16} color={theme.colors.textMuted} />
        </Pressable>

        <Pressable
          onPress={onSearchPress}
          style={styles.searchAffordance}
          accessibilityRole="button"
          accessibilityLabel="Search restaurants"
        >
          <SearchIcon size={18} color={theme.colors.textPrimary} />
          <Typography
            weight="medium"
            size="text-md"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.searchPlaceholder}
          >
            Search restaurants…
          </Typography>
        </Pressable>
      </Flex>

      {errorMessage ? (
        <View style={styles.padX}>
          <InlineAlert
            tone="warning"
            title="Location unavailable"
            message={errorMessage}
          />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  padX: {
    paddingHorizontal: space(2),
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1),
  },
  locationLabel: {
    flexShrink: 1,
  },
  searchAffordance: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1),
    minHeight: 52,
    paddingHorizontal: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  searchPlaceholder: {
    flex: 1,
  },
}));
