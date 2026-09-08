import { Fragment, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckIcon, XIcon } from "@/assets";
import {
  Button,
  Flex,
  IconButton,
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
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const occasionLabel = OCCASION_LABELS[occasion];
  const trimmedNotes = notes.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.backdropLayer}
        >
          <Pressable
            style={styles.backdrop(theme.colors.overlay)}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close confirm reservation"
          />
        </Animated.View>

        <Animated.View
          entering={SlideInDown.duration(280)}
          exiting={SlideOutDown.duration(220)}
          style={styles.sheet(theme.colors.background)}
        >
          <Flex
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            style={styles.header}
          >
            <View style={styles.headerTitleBlock}>
              <Typography size="text-xl" weight="bold">
                Confirm reservation
              </Typography>
              <Typography size="text-sm" color="secondary">
                Double-check before you book
              </Typography>
            </View>
            <IconButton
              icon={<XIcon />}
              variant="ghost"
              size="sm"
              accessibilityLabel="Close"
              onPress={onClose}
            />
          </Flex>

          <ScrollView
            bounces
            nestedScrollEnabled
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
            style={styles.bodyScroll}
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
              onPress={() => onTermsAcceptedChange(!termsAccepted)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsAccepted }}
              style={styles.termsRow}
            >
              <View
                style={[
                  styles.checkbox,
                  termsAccepted && styles.checkboxChecked,
                ]}
              >
                {termsAccepted ? (
                  <CheckIcon size={14} color={theme.colors.white} />
                ) : null}
              </View>
              <Typography
                size="text-sm"
                color="secondary"
                style={styles.termsText}
              >
                I agree to the restaurant&apos;s terms and cancellation policy.
              </Typography>
            </Pressable>

            {errorMessage ? (
              <InlineAlert tone="error" message={errorMessage} />
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, theme.space(2)) },
            ]}
          >
            <Button
              fullWidth
              size="xl"
              loading={loading}
              disabled={!termsAccepted || loading}
              onPress={onConfirm}
            >
              {depositCents > 0
                ? "Confirm & authorize deposit"
                : "Confirm reservation"}
            </Button>
          </View>
        </Animated.View>
      </View>
    </Modal>
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
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: (backgroundColor: string) => ({
    flex: 1,
    backgroundColor,
  }),
  sheet: (backgroundColor: string) => ({
    backgroundColor,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: "85%",
    overflow: "hidden",
  }),
  header: {
    paddingHorizontal: space(2.5),
    paddingTop: space(2.5),
    paddingBottom: space(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
    flexShrink: 0,
  },
  headerTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: space(0.5),
    paddingRight: space(1),
  },
  bodyScroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  body: {
    paddingHorizontal: space(2.5),
    paddingTop: space(2.5),
    paddingBottom: space(2),
    gap: space(2.5),
  },
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
  termsText: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: space(2.5),
    paddingTop: space(2),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
    flexShrink: 0,
  },
}));
