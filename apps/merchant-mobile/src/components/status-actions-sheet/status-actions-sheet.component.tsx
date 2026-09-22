import type { ReactElement } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { BottomSheet } from "@/components/bottom-sheet";
import { Typography } from "@/components/typography";
import { renderIcon } from "@/lib/helpers";
import type { IconPropsType } from "@/types";

export type StatusActionTone = "primary" | "error" | "secondary" | "warning";

export type StatusActionItem = {
  key: string;
  label: string;
  tone?: StatusActionTone;
  icon?: ReactElement<IconPropsType>;
};

export type StatusActionsListProps = {
  actions: StatusActionItem[];
  loading?: boolean;
  title?: string;
  onAction: (action: StatusActionItem) => void;
};

export function StatusActionsList({
  actions,
  loading = false,
  title = "Actions",
  onAction,
}: StatusActionsListProps) {
  const { theme } = useUnistyles();

  if (actions.length === 0) return null;

  return (
    <View style={styles.section}>
      <Typography
        size="text-xs"
        weight="semibold"
        color="muted"
        style={styles.sectionTitle}
      >
        {title}
      </Typography>
      <View style={styles.list}>
        {actions.map((action) => {
          const danger = action.tone === "error";
          const color = danger
            ? theme.colors.error
            : theme.colors.textPrimary;

          return (
            <Pressable
              key={action.key}
              disabled={loading}
              onPress={() => onAction(action)}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
                loading && styles.rowDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              {action.icon
                ? renderIcon({
                    icon: action.icon,
                    color,
                    style: styles.icon,
                  })
                : null}
              <Typography
                weight="medium"
                color={danger ? "error" : "textPrimary"}
              >
                {action.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export type StatusActionsSheetProps = {
  visible: boolean;
  description?: string;
  actions: StatusActionItem[];
  loading?: boolean;
  onClose: () => void;
  onAction: (action: StatusActionItem) => void;
};

export function StatusActionsSheet({
  visible,
  description,
  actions,
  loading,
  onClose,
  onAction,
}: StatusActionsSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="More actions"
      description={description}
      headerBorder
      loading={loading}
      showHandle
    >
      <StatusActionsList
        actions={actions}
        loading={loading}
        onAction={onAction}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  section: {
    gap: space(1),
  },
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: space(0.5),
  },
  list: {
    borderRadius: radius.lg,
    backgroundColor: colors.slate1,
    borderWidth: 1,
    borderColor: colors.secondarySubtle,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1.5),
    paddingVertical: space(1.75),
    paddingHorizontal: space(2),
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  rowDisabled: {
    opacity: 0.6,
  },
  icon: {
    width: space(2.75),
    height: space(2.75),
  },
}));
