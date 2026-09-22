import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { ChevronLeftIcon } from "@/assets";
import { Flex, IconButton, Typography } from "@/components";

export type MessageThreadHeaderProps = {
  guestName: string;
  subtitle: string | null;
  paddingTop: number;
  onBack: () => void;
};

export function MessageThreadHeader({
  guestName,
  subtitle,
  paddingTop,
  onBack,
}: MessageThreadHeaderProps) {
  return (
    <Flex
      direction="row"
      alignItems="center"
      gap={1}
      style={[styles.topBar, { paddingTop }]}
    >
      <IconButton
        icon={<ChevronLeftIcon />}
        variant="surface"
        size="sm"
        onPress={onBack}
        accessibilityLabel="Go back"
        style={styles.chromeBtn}
      />
      <Flex style={styles.topCopy} gap={0.25} alignItems="center">
        <Typography
          weight="semibold"
          size="text-lg"
          align="center"
          numberOfLines={1}
        >
          {guestName}
        </Typography>
        {subtitle ? (
          <Typography
            size="text-xs"
            color="muted"
            align="center"
            numberOfLines={1}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Flex>
      <View style={styles.topSpacer} />
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  topBar: {
    paddingHorizontal: space(2),
    paddingBottom: space(1),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondarySubtle,
  },
  chromeBtn: {
    width: space(5),
    height: space(5),
    borderRadius: radius.full,
  },
  topCopy: {
    flex: 1,
    minWidth: 0,
  },
  topSpacer: {
    width: space(5),
  },
}));
