import type { ReactElement, ReactNode } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronRightIcon } from "@/assets";
import { Flex, Typography } from "@/components";
import { renderIcon } from "@/lib/helpers";
import type { IconPropsType } from "@/types";

export type ReservationDetailRow = {
  key: string;
  label: string;
  value: string;
  icon?: ReactElement<IconPropsType>;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export type ReservationDetailSectionProps = {
  title: string;
  rows: ReservationDetailRow[];
  footer?: ReactNode;
};

export function ReservationDetailSection({
  title,
  rows,
  footer,
}: ReservationDetailSectionProps) {
  if (rows.length === 0 && !footer) return null;

  return (
    <Flex gap={1}>
      <Typography
        size="text-xs"
        weight="semibold"
        color="muted"
        style={styles.sectionTitle}
      >
        {title}
      </Typography>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <DetailRow
            key={row.key}
            label={row.label}
            value={row.value}
            icon={row.icon}
            onPress={row.onPress}
            accessibilityLabel={row.accessibilityLabel}
            isLast={index === rows.length - 1 && !footer}
          />
        ))}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </Flex>
  );
}

function DetailRow({
  label,
  value,
  icon,
  onPress,
  accessibilityLabel,
  isLast,
}: {
  label: string;
  value: string;
  icon?: ReactElement<IconPropsType>;
  onPress?: () => void;
  accessibilityLabel?: string;
  isLast: boolean;
}) {
  const { theme } = useUnistyles();
  const interactive = Boolean(onPress);

  const content = (
    <Flex
      direction="row"
      alignItems="center"
      gap={1.5}
      style={[styles.row, !isLast && styles.rowBorder]}
    >
      {icon ? <View style={styles.iconWell}>{icon}</View> : null}
      <Flex flex={1} gap={0.25} style={styles.rowCopy}>
        <Typography size="text-xs" color="muted">
          {label}
        </Typography>
        <Typography
          size="text-md"
          weight="medium"
          numberOfLines={interactive ? 2 : undefined}
        >
          {value}
        </Typography>
      </Flex>
      {interactive
        ? renderIcon({
            icon: <ChevronRightIcon />,
            color: theme.colors.textMuted,
            style: styles.chevron,
          })
        : null}
    </Flex>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
      style={({ pressed }) => pressed && styles.rowPressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: space(0.5),
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  row: {
    paddingVertical: space(1.25),
    paddingHorizontal: space(2),
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
  },
  iconWell: {
    width: space(5),
    height: space(5),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowCopy: {
    minWidth: 0,
  },
  rowPressed: {
    opacity: 0.85,
  },
  chevron: {
    width: 18,
    height: 18,
    flexShrink: 0,
  },
  footer: {
    paddingVertical: space(1.5),
    paddingHorizontal: space(2),
  },
}));
