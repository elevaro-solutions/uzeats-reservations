import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Dimensions, Platform, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { CalendarIcon, ChevronDownIcon, UserIcon } from "@/assets";
import { BottomSheet, Button, Flex, Typography } from "@/components";
import { parseIsoDate, toIsoDate } from "@/lib/helpers/date-time.helpers";

import { formatQuickDateLabel } from "../helpers/booking-date-label.helpers";
import { formatGuestCount } from "../helpers/format-guest-count.helpers";
import {
  BOOKING_MAX_DAYS_AHEAD,
  maxBookableIsoDate,
} from "../helpers/time-slots.helpers";
import { PartySizeChipPicker } from "../../search/components/party-size-chip-picker.component";

export type BookingQuickSelectorsProps = {
  date: string;
  partySize: number;
  maxAdvanceDays?: number;
  onDateChange: (iso: string) => void;
  onPartySizeChange: (size: number) => void;
};

const SHEET_MIN_HEIGHT_RATIO = 0.42;

export function BookingQuickSelectors({
  date,
  partySize,
  maxAdvanceDays = BOOKING_MAX_DAYS_AHEAD,
  onDateChange,
  onPartySizeChange,
}: BookingQuickSelectorsProps) {
  const { theme } = useUnistyles();
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

  const maximumDate = useMemo(() => {
    const iso = maxBookableIsoDate(maxAdvanceDays);
    const parsed = parseIsoDate(iso);
    if (!parsed) return undefined;
    parsed.setHours(23, 59, 59, 999);
    return parsed;
  }, [maxAdvanceDays]);

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
  const guestLabel = formatGuestCount(partySize);
  const doneLabel = `Done · ${formatGuestCount(draftPartySize)}`;

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

      <BottomSheet
        visible={dateOpen && Platform.OS === "ios"}
        onClose={closeDatePicker}
        title="Select date"
        headerBorder
        padded={false}
        maxHeight="55%"
        minHeight={sheetMinHeight}
        accessibilityLabel="Close date picker"
        footer={
          <Button size="xl" fullWidth onPress={commitDate}>
            Done
          </Button>
        }
      >
        <View style={styles.pickerArea}>
          <DateTimePicker
            value={draftDate}
            mode="date"
            display="spinner"
            minimumDate={today}
            maximumDate={maximumDate}
            onChange={handleDraftChange}
            themeVariant="light"
            style={[styles.picker, { width: pickerWidth }]}
          />
        </View>
      </BottomSheet>

      {dateOpen && Platform.OS === "android" ? (
        <DateTimePicker
          value={parseIsoDate(date) ?? new Date()}
          mode="date"
          display="default"
          minimumDate={today}
          maximumDate={maximumDate}
          onChange={handleAndroidDateChange}
        />
      ) : null}

      <BottomSheet
        visible={guestOpen}
        onClose={closeGuestPicker}
        title="Party size"
        description="How many guests are joining?"
        headerBorder
        padded={false}
        maxHeight="70%"
        accessibilityLabel="Close party size picker"
        footer={
          <Button size="xl" fullWidth onPress={commitPartySize}>
            {doneLabel}
          </Button>
        }
      >
        <View style={styles.guestBody}>
          <PartySizeChipPicker
            key={guestPickerSession}
            value={draftPartySize}
            onChange={setDraftPartySize}
          />
        </View>
      </BottomSheet>
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
}));
