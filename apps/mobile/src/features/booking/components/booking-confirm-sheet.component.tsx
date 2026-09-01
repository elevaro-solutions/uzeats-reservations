import { Modal, Pressable, ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Flex, InlineAlert, Typography } from "@/components";
import { OCCASION_LABELS, type Occasion } from "@reservations/shared";

import { formatCents } from "../helpers/booking-pricing.helpers";
import { formatSlotDateLong, formatSlotTime } from "../helpers/time-slots.helpers";

export type BookingConfirmSheetProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  userName: string;
  userEmail: string;
  slotStart: string;
  partySize: number;
  occasion: string;
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
  userEmail,
  slotStart,
  partySize,
  occasion,
  tableName,
  depositCents,
  termsAccepted,
  onTermsAcceptedChange,
  errorMessage,
}: BookingConfirmSheetProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const occasionLabel =
    OCCASION_LABELS[occasion as Occasion] ?? occasion;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Flex style={styles.header} direction="row" justifyContent="space-between">
          <Typography weight="bold" size="text-lg">
            Confirm reservation
          </Typography>
          <Pressable onPress={onClose} hitSlop={12}>
            <Typography color="secondary">Close</Typography>
          </Pressable>
        </Flex>

        <ScrollView contentContainerStyle={styles.body}>
          <Flex gap={1.5}>
            <SummaryRow label="Guest" value={`${userName} · ${userEmail}`} />
            <SummaryRow
              label="When"
              value={`${formatSlotDateLong(slotStart)} at ${formatSlotTime(slotStart)}`}
            />
            <SummaryRow
              label="Party"
              value={`${partySize} guest${partySize === 1 ? "" : "s"}`}
            />
            {occasion !== "none" ? (
              <SummaryRow label="Occasion" value={occasionLabel} />
            ) : null}
            {tableName ? (
              <SummaryRow label="Table" value={tableName} />
            ) : null}
            {depositCents > 0 ? (
              <SummaryRow label="Deposit" value={formatCents(depositCents)} />
            ) : null}
          </Flex>

          <Pressable
            onPress={() => onTermsAcceptedChange(!termsAccepted)}
            style={styles.termsRow}
          >
            <View
              style={[
                styles.checkbox,
                termsAccepted && { backgroundColor: theme.colors.primary },
              ]}
            />
            <Typography size="text-sm" style={styles.termsText}>
              I agree to the restaurant&apos;s terms and cancellation policy.
            </Typography>
          </Pressable>

          {errorMessage ? (
            <InlineAlert tone="error" message={errorMessage} />
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, theme.space(2)) }]}>
          <Button
            fullWidth
            size="xl"
            loading={loading}
            disabled={!termsAccepted || loading}
            onPress={onConfirm}
          >
            {depositCents > 0 ? "Confirm & pay deposit" : "Confirm reservation"}
          </Button>
        </View>
      </View>
    </Modal>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex gap={0.25}>
      <Typography size="text-xs" color="secondary">
        {label}
      </Typography>
      <Typography weight="medium">{value}</Typography>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: space(2),
    paddingVertical: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  body: {
    padding: space(2),
    gap: space(2),
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space(1),
    marginTop: space(1),
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: 2,
  },
  termsText: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
}));
