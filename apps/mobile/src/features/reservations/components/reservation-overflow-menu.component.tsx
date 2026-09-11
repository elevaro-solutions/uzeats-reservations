import { type ReactElement } from "react";
import { Modal, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CalendarIcon,
  CalendarPlusIcon,
  HeartIcon,
  MailIcon,
  PencilIcon,
  ReceiptTextIcon,
  SparklesIcon,
  StarIcon,
  XIcon,
} from "@/assets";
import { Flex, RemoteImage, Typography } from "@/components";
import { IconPropsType } from "@/types";

import type {
  OverflowAction,
  OverflowActionId,
} from "../helpers/reservation-actions.helpers";
import { ReservationStatusPill } from "./reservation-status-pill.component";

export type ReservationOverflowMenuProps = {
  visible: boolean;
  actions: OverflowAction[];
  onClose: () => void;
  onSelect: (id: OverflowAction["id"]) => void;
  restaurantName?: string | null;
  restaurantPhoto?: string | null;
  subtitle?: string | null;
  status: string;
  slotStart: string;
  slotEnd?: string | null;
  depositStatus?: string | null;
  depositAmountCents?: number | null;
};

function actionIcon(
  id: OverflowActionId,
  color: string,
): ReactElement<IconPropsType> {
  const props = { size: 22, color };
  switch (id) {
    case "edit":
      return <PencilIcon {...props} />;
    case "message":
      return <MailIcon {...props} />;
    case "add_to_calendar":
      return <CalendarPlusIcon {...props} />;
    case "book_again":
      return <CalendarIcon {...props} />;
    case "save_restaurant":
      return <HeartIcon {...props} />;
    case "leave_review":
      return <StarIcon {...props} />;
    case "billing":
      return <ReceiptTextIcon {...props} />;
    case "cancel":
      return <XIcon {...props} />;
    default:
      return <SparklesIcon {...props} />;
  }
}

export function ReservationOverflowMenu({
  visible,
  actions,
  onClose,
  onSelect,
  restaurantName,
  restaurantPhoto,
  subtitle,
  status,
  slotStart,
  slotEnd,
  depositStatus,
  depositAmountCents,
}: ReservationOverflowMenuProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, theme.space(2)) },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />

          <Flex
            direction="row"
            gap={1.5}
            alignItems="center"
            style={styles.header}
          >
            {restaurantPhoto ? (
              <RemoteImage
                uri={restaurantPhoto}
                style={styles.thumb}
                recyclingKey="overflow-restaurant"
              />
            ) : (
              <View style={styles.thumbPlaceholder} />
            )}
            <Flex gap={0.5} style={styles.headerCopy}>
              <Flex direction="row" alignItems="center" gap={1}>
                <Typography
                  weight="semibold"
                  numberOfLines={1}
                  style={styles.headerTitle}
                >
                  {restaurantName ?? "Restaurant"}
                </Typography>
                <ReservationStatusPill
                  status={status}
                  slotStart={slotStart}
                  slotEnd={slotEnd}
                  depositStatus={depositStatus}
                  depositAmountCents={depositAmountCents}
                />
              </Flex>
              {subtitle ? (
                <Typography size="text-sm" color="muted" numberOfLines={1}>
                  {subtitle}
                </Typography>
              ) : null}
            </Flex>
          </Flex>

          <View style={styles.list}>
            {actions.length === 0 ? (
              <Typography color="muted" style={styles.empty}>
                No additional actions for this booking.
              </Typography>
            ) : (
              actions.map((action) => {
                const danger = action.tone === "danger";
                const color = danger
                  ? theme.colors.error
                  : theme.colors.textPrimary;
                return (
                  <Pressable
                    key={action.id}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && styles.rowPressed,
                    ]}
                    onPress={() => {
                      // Close first, then defer selection so a nested Modal /
                      // native calendar UI is not presented while this sheet
                      // is still dismissing (iOS will auto-dismiss it).
                      onClose();
                      setTimeout(() => {
                        onSelect(action.id);
                      }, 400);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                  >
                    {actionIcon(action.id, color)}
                    <Typography
                      weight="medium"
                      color={danger ? "error" : "textPrimary"}
                    >
                      {action.label}
                    </Typography>
                  </Pressable>
                );
              })
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space(2),
    paddingTop: space(1),
    gap: space(1.5),
  },
  handle: {
    alignSelf: "center",
    width: space(5),
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.slate5,
    marginBottom: space(0.5),
  },
  header: {
    padding: space(1.5),
    borderRadius: radius.lg,
    backgroundColor: colors.slate1,
    borderWidth: 1,
    borderColor: colors.slate2,
  },
  thumb: {
    width: space(6),
    height: space(6),
    borderRadius: radius.md,
    backgroundColor: colors.slate3,
  },
  thumbPlaceholder: {
    width: space(6),
    height: space(6),
    borderRadius: radius.md,
    backgroundColor: colors.slate3,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    flexShrink: 1,
    minWidth: 0,
  },
  list: {
    paddingVertical: space(0.5),
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
  empty: {
    paddingVertical: space(2),
    paddingHorizontal: space(2),
  },
}));
