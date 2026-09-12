import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex, Typography } from "@/components";

export type StatusTone =
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "muted";

export type StatusTonePillProps = {
  label: string;
  tone: StatusTone;
  capitalize?: boolean;
};

function labelColor(
  tone: StatusTone,
): "primary" | "info" | "success" | "warning" | "error" | "secondary" {
  if (tone === "muted") return "secondary";
  return tone;
}

export function StatusTonePill({
  label,
  tone,
  capitalize = false,
}: StatusTonePillProps) {
  styles.useVariants({ tone });

  return (
    <Flex direction="row" alignItems="center" gap={0.5} style={styles.pill}>
      <View style={styles.dot} />
      <Typography
        size="text-xs"
        weight="medium"
        color={labelColor(tone)}
        style={capitalize ? styles.capitalize : undefined}
      >
        {label}
      </Typography>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  pill: {
    paddingHorizontal: space(1),
    paddingVertical: space(0.5),
    borderRadius: radius.full,
    variants: {
      tone: {
        primary: { backgroundColor: colors.primarySubtle },
        info: { backgroundColor: colors.infoSubtle },
        success: { backgroundColor: colors.successSubtle },
        warning: { backgroundColor: colors.warningSubtle },
        error: { backgroundColor: colors.errorSubtle },
        muted: { backgroundColor: colors.slate3 },
      },
    },
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    variants: {
      tone: {
        primary: { backgroundColor: colors.primary },
        info: { backgroundColor: colors.info },
        success: { backgroundColor: colors.success },
        warning: { backgroundColor: colors.warning },
        error: { backgroundColor: colors.error },
        muted: { backgroundColor: colors.textMuted },
      },
    },
  },
  capitalize: {
    textTransform: "capitalize",
  },
}));
