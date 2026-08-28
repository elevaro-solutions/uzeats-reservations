import { Pressable } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Typography } from "@/components";

export type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({
  title,
  actionLabel = "See all",
  onActionPress,
}: SectionHeaderProps) {
  return (
    <Pressable
      onPress={onActionPress}
      disabled={!onActionPress}
      style={styles.row}
    >
      <Typography weight="bold" size="text-lg" style={styles.title}>
        {title}
      </Typography>
      {onActionPress ? (
        <Typography size="text-sm" weight="semibold" color="primary">
          {actionLabel}
        </Typography>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space(1),
    paddingHorizontal: space(2),
  },
  title: {
    flex: 1,
  },
}));
