import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { BottomSheet, Typography } from "@/components";
import { renderIcon } from "@/lib/helpers";

import { reservationActionIcon } from "../helpers/reservation-action-icon.helpers";
import type { ReservationAction } from "../helpers/reservation-status.helpers";

export type ReservationActionsSheetProps = {
  visible: boolean;
  guestName: string;
  actions: ReservationAction[];
  loading?: boolean;
  onClose: () => void;
  onAction: (action: ReservationAction) => void;
};

export function ReservationActionsSheet({
  visible,
  guestName,
  actions,
  loading,
  onClose,
  onAction,
}: ReservationActionsSheetProps) {
  const { theme } = useUnistyles();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="More actions"
      description={guestName}
      headerBorder
      loading={loading}
      showHandle
    >
      <View style={styles.section}>
        <Typography size="text-xs" weight="semibold" color="muted" style={styles.sectionTitle}>
          Actions
        </Typography>
        <View style={styles.list}>
          {actions.map((action) => {
            const danger = action.tone === "error";
            const color = danger
              ? theme.colors.error
              : theme.colors.textPrimary;

            return (
              <Pressable
                key={action.status}
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
                {renderIcon({
                  icon: reservationActionIcon(action.status),
                  color,
                  style: styles.icon,
                })}
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
    borderColor: colors.slate2,
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
    backgroundColor: colors.slate2,
  },
  rowDisabled: {
    opacity: 0.6,
  },
  icon: {
    width: 22,
    height: 22,
  },
}));
