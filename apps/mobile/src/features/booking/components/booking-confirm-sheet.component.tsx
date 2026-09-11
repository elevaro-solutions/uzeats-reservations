import { Fragment, type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { CheckIcon } from "@/assets";
import {
  BottomSheet,
  Button,
  Flex,
  InlineAlert,
  Typography,
} from "@/components";
import { OCCASION_LABELS, type Occasion } from "@reservations/shared";

import { formatCents } from "../helpers/booking-pricing.helpers";
import { formatGuestCount } from "../helpers/format-guest-count.helpers";
import {
  formatSlotDateLong,
  formatSlotTime,
} from "../helpers/time-slots.helpers";

export type BookingConfirmSheetProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  userName: string;
  slotStart: string;
  partySize: number;
  occasion: Occasion;
  notes?: string;
  tableName?: string | null;
  depositCents: number;
  termsAccepted: boolean;
  onTermsAcceptedChange: (value: boolean) => void;
  errorMessage?: string | null;
};

export function BookingConfirmSheet({
  visible,
  onClose,
  onConfirm,
  loading = false,
  userName,
  slotStart,
  partySize,
  occasion,
  notes = "",
  tableName,
  depositCents,
  termsAccepted,
  onTermsAcceptedChange,
  errorMessage,
}: BookingConfirmSheetProps) {
  const { theme } = useUnistyles();
  const occasionLabel = OCCASION_LABELS[occasion];
  const trimmedNotes = notes.trim();
  const [termsHint, setTermsHint] = useState(false);

  function handleConfirm() {
    if (!termsAccepted) {
      setTermsHint(true);
      return;
    }
    setTermsHint(false);
    onConfirm();
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Confirm reservation"
      description="Double-check before you book"
      loading={loading}
      headerBorder
      scrollable
      accessibilityLabel="Close confirm reservation"
      footer={
        <Button
          fullWidth
          size="xl"
          loading={loading}
          disabled={loading}
          onPress={handleConfirm}
        >
          {depositCents > 0
            ? "Confirm & authorize deposit"
            : "Confirm reservation"}
        </Button>
      }
    >
      <Flex gap={1.5}>
        <Typography size="text-md" weight="semibold" color="secondary">
          Reservation details
        </Typography>
        <View style={styles.summaryCard}>
          {(
            [
              {
                label: "Guest",
                content: (
                  <Typography weight="medium" style={styles.valueText}>
                    {userName}
                  </Typography>
                ),
              },
              {
                label: "Date",
                content: (
                  <Typography weight="medium" style={styles.valueText}>
                    {formatSlotDateLong(slotStart)}
                  </Typography>
                ),
              },
              {
                label: "Time",
                content: (
                  <Typography weight="medium" style={styles.valueText}>
                    {formatSlotTime(slotStart)}
                  </Typography>
                ),
              },
              {
                label: "Party",
                content: (
                  <Typography weight="medium" style={styles.valueText}>
                    {formatGuestCount(partySize)}
                  </Typography>
                ),
              },
              occasion !== "none"
                ? {
                    label: "Occasion",
                    content: (
                      <Typography weight="medium" style={styles.valueText}>
                        {occasionLabel}
                      </Typography>
                    ),
                  }
                : null,
              tableName
                ? {
                    label: "Table",
                    content: (
                      <Typography weight="medium" style={styles.valueText}>
                        {tableName}
                      </Typography>
                    ),
                  }
                : null,
              depositCents > 0
                ? {
                    label: "Deposit hold",
                    content: (
                      <Typography weight="medium" style={styles.valueText}>
                        {formatCents(depositCents)}
                      </Typography>
                    ),
                  }
                : null,
              trimmedNotes
                ? {
                    label: "Comment",
                    content: (
                      <Typography
                        weight="medium"
                        style={styles.valueText}
                        numberOfLines={3}
                      >
                        {trimmedNotes}
                      </Typography>
                    ),
                  }
                : null,
            ] as Array<{ label: string; content: ReactNode } | null>
          )
            .filter(
              (row): row is { label: string; content: ReactNode } =>
                row != null,
            )
            .map((row, index, rows) => (
              <SummaryRow
                key={row.label}
                label={row.label}
                last={index === rows.length - 1}
              >
                {row.content}
              </SummaryRow>
            ))}
        </View>
      </Flex>

      {depositCents > 0 ? (
        <InlineAlert
          tone="info"
          message={`Next: authorize ${formatCents(depositCents)} on your card via Stripe. This is a hold, not a charge unless you no-show or cancel late.`}
        />
      ) : null}

      <Pressable
        onPress={() => {
          onTermsAcceptedChange(!termsAccepted);
          setTermsHint(false);
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: termsAccepted }}
        style={styles.termsRow}
      >
        <View
          style={[
            styles.checkbox,
            termsAccepted && styles.checkboxChecked,
            termsHint && !termsAccepted && styles.checkboxWarn,
          ]}
        >
          {termsAccepted ? (
            <CheckIcon size={14} color={theme.colors.white} />
          ) : null}
        </View>
        <Typography size="text-sm" color="secondary" style={styles.termsText}>
          I agree to the restaurant&apos;s terms and cancellation policy.
        </Typography>
      </Pressable>

      {termsHint && !termsAccepted ? (
        <InlineAlert
          tone="warning"
          message="Accept the terms and cancellation policy to continue."
        />
      ) : null}

      {errorMessage ? (
        <InlineAlert tone="error" message={errorMessage} />
      ) : null}
    </BottomSheet>
  );
}

function SummaryRow({
  label,
  children,
  last = false,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <Fragment>
      <Flex
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={1.5}
        style={styles.summaryRow}
      >
        <Typography size="text-sm" color="secondary" style={styles.label}>
          {label}
        </Typography>
        <View style={styles.value}>{children}</View>
      </Flex>
      {last ? null : <View style={styles.divider} />}
    </Fragment>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  summaryCard: {
    backgroundColor: colors.slate1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate4,
    overflow: "hidden",
  },
  summaryRow: {
    paddingVertical: space(2),
    paddingHorizontal: space(2),
  },
  label: {
    paddingTop: space(0.25),
    flexShrink: 0,
  },
  value: {
    flex: 1,
    alignItems: "flex-end",
    minWidth: 0,
  },
  valueText: {
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate4,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space(1.5),
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    marginTop: space(0.25),
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxWarn: {
    borderColor: colors.warning,
  },
  termsText: {
    flex: 1,
  },
}));
