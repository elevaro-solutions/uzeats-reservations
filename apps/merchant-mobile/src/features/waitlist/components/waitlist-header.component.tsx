import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { ChevronLeftIcon } from "@/assets";
import { Flex, IconButton, Typography } from "@/components";

export type WaitlistHeaderProps = {
  waitingCount: number | null;
  onBack: () => void;
};

export function WaitlistHeader({ waitingCount, onBack }: WaitlistHeaderProps) {
  return (
    <Flex direction="column" style={styles.topBar}>
      <Flex direction="row" alignItems="center">
        <IconButton
          icon={<ChevronLeftIcon />}
          variant="surface"
          size="sm"
          onPress={onBack}
          accessibilityLabel="Go back"
          style={styles.chromeBtn}
        />
        <Typography weight="semibold" size="text-lg" style={styles.topTitle}>
          Waitlist
        </Typography>
        <View style={styles.chromeBtn} />
      </Flex>
      {waitingCount != null ? (
        <Typography size="text-sm" color="muted" style={styles.queueSummary}>
          {waitingCount === 1 ? "1 waiting" : `${waitingCount} waiting`}
        </Typography>
      ) : null}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  topBar: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.secondarySubtle,
    gap: space(0.25),
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
  },
  queueSummary: {
    textAlign: "center",
  },
  chromeBtn: {
    width: space(5),
    height: space(5),
    borderRadius: radius.full,
  },
}));
