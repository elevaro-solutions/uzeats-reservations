import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Flex, Typography } from "@/components";

export type TermsToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
};

export function TermsToggle({ value, onChange, error }: TermsToggleProps) {
  const { theme } = useUnistyles();

  return (
    <Flex gap={0.75}>
      <Pressable
        onPress={() => onChange(!value)}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        style={styles.row}
      >
        <View style={[styles.track, value && styles.trackOn]}>
          <View style={[styles.thumb, value && styles.thumbOn]} />
        </View>
        <Typography size="text-sm" color="secondary" style={styles.label}>
          I agree to the Terms & Privacy Policy
        </Typography>
      </Pressable>
      {error ? (
        <Typography size="text-sm" style={{ color: theme.colors.error }}>
          {error}
        </Typography>
      ) : null}
    </Flex>
  );
}

const styles = StyleSheet.create(({ colors, space, radius }) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1.5),
  },
  track: {
    width: 44,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.slate4,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  trackOn: {
    backgroundColor: colors.primary,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignSelf: "flex-start",
  },
  thumbOn: {
    alignSelf: "flex-end",
  },
  label: {
    flex: 1,
  },
}));
