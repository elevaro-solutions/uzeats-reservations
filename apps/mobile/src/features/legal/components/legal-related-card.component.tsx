import { Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronRightIcon } from "@/assets";
import { Flex, Typography } from "@/components";

type LegalRelatedCardProps = {
  title: string;
  description: string;
  onPress: () => void;
};

export function LegalRelatedCard({
  title,
  description,
  onPress,
}: LegalRelatedCardProps) {
  const { theme } = useUnistyles();

  return (
    <Flex gap={1}>
      <Typography size="text-lg" weight="semibold">
        Related
      </Typography>
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel={`Open ${title}`}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <Flex flex={1} gap={0.25} style={styles.copy}>
          <Typography size="text-sm" weight="semibold" numberOfLines={1}>
            {title}
          </Typography>
          <Typography size="text-xs" color="secondary" numberOfLines={2}>
            {description}
          </Typography>
        </Flex>
        <ChevronRightIcon size={18} color={theme.colors.textMuted} />
      </Pressable>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1),
    paddingVertical: space(1.5),
    paddingHorizontal: space(1.75),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.background,
  },
  cardPressed: {
    backgroundColor: colors.slate2,
  },
  copy: {
    minWidth: 0,
  },
}));
