import { ActivityIndicator, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { MapPinIcon } from "@/assets";
import { Flex, Typography } from "@/components";

export type LocationResultRowProps = {
  title: string;
  subtitle?: string;
  selected?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
};

export function LocationResultRow({
  title,
  subtitle,
  selected = false,
  loading = false,
  accessibilityLabel,
  onPress,
}: LocationResultRowProps) {
  const { theme } = useUnistyles();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityState={{ selected, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? title}
    >
      <View style={[styles.iconWell, selected && styles.iconWellSelected]}>
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <MapPinIcon
            size={18}
            color={selected ? theme.colors.primary : theme.colors.textPrimary}
          />
        )}
      </View>
      <Flex flex={1} gap={0.25} style={styles.copy}>
        <Typography
          weight="semibold"
          numberOfLines={1}
          color={selected ? "primary" : "textPrimary"}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography size="text-xs" color="muted" numberOfLines={1}>
            {subtitle}
          </Typography>
        ) : null}
      </Flex>
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1.5),
    paddingVertical: space(1.5),
    paddingHorizontal: space(2),
  },
  rowSelected: {
    backgroundColor: colors.slate2,
  },
  rowPressed: {
    backgroundColor: colors.slate2,
  },
  copy: {
    minWidth: 0,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWellSelected: {
    backgroundColor: colors.primarySubtle,
  },
}));
