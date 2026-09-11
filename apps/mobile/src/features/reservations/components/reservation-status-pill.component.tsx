import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex, Typography } from "@/components";

import {
  displayReservationStatus,
  statusLabel,
} from "../helpers/reservation-display.helpers";

export type ReservationStatusPillProps = {
  status: string;
  slotStart: string;
  slotEnd?: string | null;
  depositStatus?: string | null;
  depositAmountCents?: number | null;
};

type Tone = "primary" | "success" | "warning" | "error" | "muted";

function toneForStatus(status: string): Tone {
  switch (status) {
    case "confirmed":
    case "seated":
      return "success";
    case "pending":
    case "deposit_due":
      return "warning";
    case "cancelled":
    case "no_show":
      return "error";
    case "completed":
    case "past":
      return "muted";
    default:
      return "primary";
  }
}

function labelColor(
  tone: Tone,
): "primary" | "success" | "warning" | "error" | "secondary" {
  if (tone === "muted") return "secondary";
  return tone;
}

export function ReservationStatusPill({
  status,
  slotStart,
  slotEnd,
  depositStatus,
  depositAmountCents,
}: ReservationStatusPillProps) {
  const display = displayReservationStatus({
    status,
    slotStart,
    slotEnd,
    depositStatus,
    depositAmountCents,
  });
  const tone = toneForStatus(display);
  styles.useVariants({ tone });

  return (
    <Flex direction="row" alignItems="center" gap={0.5} style={styles.pill}>
      <View style={styles.dot} />
      <Typography
        size="text-xs"
        weight="medium"
        color={labelColor(tone)}
        style={styles.label}
      >
        {statusLabel(display)}
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
        success: { backgroundColor: colors.success },
        warning: { backgroundColor: colors.warning },
        error: { backgroundColor: colors.error },
        muted: { backgroundColor: colors.textMuted },
      },
    },
  },
  label: {
    textTransform: "capitalize",
  },
}));
