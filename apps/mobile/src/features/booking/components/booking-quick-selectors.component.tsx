import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Dimensions, Modal, Platform, Pressable, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { CalendarIcon, ChevronDownIcon, UserIcon, XIcon } from "@/assets";
import { Button, Flex, IconButton, Typography } from "@/components";
import { parseIsoDate, toIsoDate } from "@/lib/helpers/date-time.helpers";

import { formatQuickDateLabel } from "../helpers/booking-date-label.helpers";
import { PartySizeChipPicker } from "../../search/components/party-size-chip-picker.component";

export type BookingQuickSelectorsProps = {
  date: string;
  partySize: number;
  onDateChange: (iso: string) => void;
  onPartySizeChange: (size: number) => void;
};

const SHEET_MIN_HEIGHT_RATIO = 0.42;

export function BookingQuickSelectors({
  date,
  partySize,
  onDateChange,
  onPartySizeChange,
}: BookingQuickSelectorsProps) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const [dateOpen, setDateOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(
    () => parseIsoDate(date) ?? new Date(),
  );
  const [draftPartySize, setDraftPartySize] = useState(partySize);
  const [guestPickerSession, setGuestPickerSession] = useState(0);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const sheetMinHeight = useMemo(
    () => Dimensions.get("window").height * SHEET_MIN_HEIGHT_RATIO,
    [],
  );

  const pickerWidth = useMemo(() => Dimensions.get("window").width, []);

  function openDatePicker() {
    setDraftDate(parseIsoDate(date) ?? new Date());
    setDateOpen(true);
  }

  function closeDatePicker() {
    setDateOpen(false);
  }

  function commitDate() {
    onDateChange(toIsoDate(draftDate));
    setDateOpen(false);
  }

  function openGuestPicker() {
    setDraftPartySize(partySize);
    setGuestPickerSession((session) => session + 1);
    setGuestOpen(true);
  }

  function closeGuestPicker() {
    setGuestOpen(false);
  }

  function commitPartySize() {
    onPartySizeChange(draftPartySize);
    setGuestOpen(false);
  }

  function handleAndroidDateChange(
    event: DateTimePickerEvent,
    selected?: Date,
  ) {
    if (event.type === "dismissed") {
      setDateOpen(false);
      return;
    }
    if (!selected) return;
    onDateChange(toIsoDate(selected));
    setDateOpen(false);
  }

  function handleDraftChange(_event: DateTimePickerEvent, selected?: Date) {
    if (selected) {
      setDraftDate(selected);
    }
  }

  const dateLabel = formatQuickDateLabel(date);
  const guestLabel = `${partySize} guest${partySize === 1 ? "" : "s"}`;
  const doneLabel = `Done · ${draftPartySize} guest${draftPartySize === 1 ? "" : "s"}`;

  return (
    <>
      <Flex direction="row" gap={1} style={styles.row}>
        <Pressable
          onPress={openDatePicker}
          style={styles.trigger}
          accessibilityRole="button"
          accessibilityLabel={`Date, ${dateLabel}`}
        >
          <CalendarIcon size={20} color={theme.colors.primary} />
          <Typography
            weight="semibold"
            size="text-md"
            numberOfLines={1}
            style={styles.triggerLabel}
          >
            {dateLabel}
          </Typography>
          <ChevronDownIcon size={18} color={theme.colors.textMuted} />
        </Pressable>

        <Pressable
          onPress={openGuestPicker}
          style={styles.trigger}
          accessibilityRole="button"
          accessibilityLabel={`Party size, ${guestLabel}`}
        >
          <UserIcon size={20} color={theme.colors.primary} />
          <Typography
            weight="semibold"
            size="text-md"
            numberOfLines={1}
            style={styles.triggerLabel}
          >
            {guestLabel}
          </Typography>
          <ChevronDownIcon size={18} color={theme.colors.textMuted} />
        </Pressable>
      </Flex>

      <Modal
        visible={dateOpen && Platform.OS === "ios"}
        transparent
        animationType="fade"
        onRequestClose={closeDatePicker}
      >
        <View style={styles.modalRoot}>
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.backdropLayer}
          >
            <Pressable
              style={styles.backdrop(theme.colors.overlay)}
              onPress={closeDatePicker}
              accessibilityRole="button"
              accessibilityLabel="Close date picker"
            />
          </Animated.View>

          <Animated.View
            entering={SlideInDown.duration(280)}
            exiting={SlideOutDown.duration(220)}
            style={[styles.sheet(theme.colors.background, sheetMinHeight)]}
            onStartShouldSetResponder={() => true}
          >
            <Flex
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              style={styles.sheetHeader}
            >
              <Typography size="text-xl" weight="bold">
                Select date
              </Typography>
              <IconButton
                icon={<XIcon />}
                variant="ghost"
                size="sm"
                accessibilityLabel="Close"
                onPress={closeDatePicker}
              />
            </Flex>

            <View style={styles.pickerArea}>
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                minimumDate={today}
                onChange={handleDraftChange}
                themeVariant="light"
                style={[styles.picker, { width: pickerWidth }]}
              />
            </View>

            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom, theme.space(2)) },
              ]}
            >
              <Button size="xl" fullWidth onPress={commitDate}>
                Done
              </Button>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {dateOpen && Platform.OS === "android" ? (
        <DateTimePicker
          value={parseIsoDate(date) ?? new Date()}
          mode="date"
          display="default"
          minimumDate={today}
          onChange={handleAndroidDateChange}
        />
      ) : null}

      <Modal
        visible={guestOpen}
        transparent
        animationType="fade"
        onRequestClose={closeGuestPicker}
      >
        <View style={styles.modalRoot}>
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.backdropLayer}
          >
            <Pressable
              style={styles.backdrop(theme.colors.overlay)}
              onPress={closeGuestPicker}
              accessibilityRole="button"
              accessibilityLabel="Close party size picker"
            />
          </Animated.View>

          <Animated.View
            entering={SlideInDown.duration(280)}
            exiting={SlideOutDown.duration(220)}
            style={[styles.guestSheet(theme.colors.background)]}
            onStartShouldSetResponder={() => true}
          >
            <Flex
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              style={styles.sheetHeader}
            >
              <Flex gap={0.25} style={styles.sheetTitleBlock}>
                <Typography size="text-xl" weight="bold">
                  Party size
                </Typography>
                <Typography size="text-sm" color="secondary">
                  How many guests are joining?
                </Typography>
              </Flex>
              <IconButton
                icon={<XIcon />}
                variant="ghost"
                size="sm"
                accessibilityLabel="Close"
                onPress={closeGuestPicker}
              />
            </Flex>

            <View style={styles.guestBody}>
              <PartySizeChipPicker
                key={guestPickerSession}
                value={draftPartySize}
                onChange={setDraftPartySize}
              />
            </View>

            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom, theme.space(2)) },
              ]}
            >
              <Button size="xl" fullWidth onPress={commitPartySize}>
                {doneLabel}
              </Button>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  row: {
    paddingHorizontal: space(2),
  },
  trigger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space(1),
    paddingVertical: space(1.75),
    paddingHorizontal: space(2),
    borderRadius: radius.md,
    backgroundColor: colors.slate2,
    minHeight: space(6),
    minWidth: 0,
  },
  triggerLabel: {
    flex: 1,
    minWidth: 0,
  },
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
  sheet: (backgroundColor: string, minHeight: number) => ({
    backgroundColor,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    minHeight,
    maxHeight: "55%",
  }),
  guestSheet: (backgroundColor: string) => ({
    backgroundColor,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: "70%",
  }),
  sheetHeader: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
    paddingBottom: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
  },
  sheetTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  pickerArea: {
    flex: 1,
    width: "100%",
    minHeight: 216,
    alignItems: "center",
    justifyContent: "center",
  },
  picker: {
    alignSelf: "center",
    height: 216,
  },
  guestBody: {
    paddingHorizontal: space(2.5),
    paddingVertical: space(2.5),
  },
  footer: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
  },
}));
