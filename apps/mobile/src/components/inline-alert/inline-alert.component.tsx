import { ReactElement } from "react";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { CircleAlertIcon, XIcon } from "@/assets";
import { renderIcon } from "@/lib/helpers";
import { IconPropsType } from "@/types";

import { Button } from "../button";
import { Flex } from "../flex";
import { Typography } from "../typography";

export type InlineAlertTone = "info" | "success" | "warning" | "error";

export type InlineAlertProps = {
  title?: string;
  message: string;
  tone?: InlineAlertTone;
  icon?: ReactElement<IconPropsType>;
  onDismiss?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
  style?: StyleProp<ViewStyle>;
};

const TONE_KEYS: Record<
  InlineAlertTone,
  { accent: "info" | "success" | "warning" | "error"; subtle: "infoSubtle" | "successSubtle" | "warningSubtle" | "errorSubtle" }
> = {
  info: { accent: "info", subtle: "infoSubtle" },
  success: { accent: "success", subtle: "successSubtle" },
  warning: { accent: "warning", subtle: "warningSubtle" },
  error: { accent: "error", subtle: "errorSubtle" },
};

export function InlineAlert({
  icon,
  style,
  title,
  message,
  onAction,
  onDismiss,
  actionLabel,
  actionLoading,
  tone = "info",
}: InlineAlertProps) {
  const { theme } = useUnistyles();
  const keys = TONE_KEYS[tone];
  const accentColor = theme.colors[keys.accent];
  const backgroundColor = theme.colors[keys.subtle];
  const resolvedIcon = icon ?? <CircleAlertIcon />;

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <Flex gap={1.5} direction="row" alignItems="flex-start">
        {renderIcon({
          icon: resolvedIcon,
          color: accentColor,
          style: styles.icon,
        })}
        <Flex flex={1} gap={0.5}>
          {title ? (
            <Typography size="text-sm" weight="semibold">
              {title}
            </Typography>
          ) : null}
          <Typography
            size="text-sm"
            color={title ? "secondary" : "textPrimary"}
            weight={title ? "regular" : "medium"}
          >
            {message}
          </Typography>
        </Flex>
        {actionLabel && onAction ? (
          <Button
            size="sm"
            color="secondary"
            variant="outlined"
            onPress={onAction}
            loading={actionLoading}
          >
            {actionLabel}
          </Button>
        ) : null}
        {onDismiss ? (
          <Pressable
            hitSlop={8}
            onPress={onDismiss}
            accessibilityRole="button"
          >
            <XIcon size={16} color={theme.colors.textSecondary} />
          </Pressable>
        ) : null}
      </Flex>
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius }) => ({
  container: {
    borderRadius: radius.md,
    padding: space(1.5),
  },
  icon: {
    width: 20,
    height: 20,
  },
}));
