import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useEffect, useMemo, useState } from "react";
import { Dimensions, Modal, Platform, Pressable, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { CalendarIcon, ChevronDownIcon, ClockIcon, XIcon } from "@/assets";
import { Button, Flex, IconButton, Typography } from "@/components";
import {
  formatDisplayDate,
  formatDisplayTime,
  parseIsoDate,
  parseTime24,
  toIsoDate,
  toTime24,
} from "@/lib/helpers/date-time.helpers";

export type DateTimeFieldProps = {
  label: string;
  mode: "date" | "time";
  value?: string;
  onChange: (value: string | undefined) => void;
  minimumDate?: Date;
};

const SHEET_MIN_HEIGHT_RATIO = 0.42;

function valueToDate(mode: "date" | "time", value?: string): Date {
  if (mode === "date") {
    return parseIsoDate(value ?? toIsoDate(new Date())) ?? new Date();
  }
  if (value) {
    const parsed = parseTime24(value);
    if (parsed) {
      const date = new Date();
      date.setHours(parsed.hours, parsed.minutes, 0, 0);
      return date;
    }
  }
  return new Date();
}

export function DateTimeField({
  label,
  mode,
  value,
  onChange,
  minimumDate,
}: DateTimeFieldProps) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(() => valueToDate(mode, value));

  const sheetMinHeight = useMemo(
    () => Dimensions.get("window").height * SHEET_MIN_HEIGHT_RATIO,
    [],
  );

  const pickerWidth = useMemo(() => Dimensions.get("window").width, []);

  useEffect(() => {
    if (!open) return;
    setDraftDate(valueToDate(mode, value));
  }, [open, mode, value]);

  const displayValue =
    mode === "date"
      ? value
        ? formatDisplayDate(value)
        : "Select date"
      : formatDisplayTime(value);

  const androidPickerValue = valueToDate(mode, value);

  function dismiss() {
    setOpen(false);
  }

  function openPicker() {
    setDraftDate(valueToDate(mode, value));
    setOpen(true);
  }

  function commitDraft() {
    if (mode === "date") {
      onChange(toIsoDate(draftDate));
    } else {
      onChange(toTime24(draftDate.getHours(), draftDate.getMinutes()));
    }
    setOpen(false);
  }

  function handleAndroidChange(event: DateTimePickerEvent, selected?: Date) {
    if (event.type === "dismissed") {
      setOpen(false);
      return;
    }
    if (!selected) return;

    if (mode === "date") {
      onChange(toIsoDate(selected));
    } else {
      onChange(toTime24(selected.getHours(), selected.getMinutes()));
    }
    setOpen(false);
  }

  function handleDraftChange(_event: DateTimePickerEvent, selected?: Date) {
    if (selected) {
      setDraftDate(selected);
    }
  }

  const Icon = mode === "date" ? CalendarIcon : ClockIcon;

  return (
    <>
      <Flex flex={1} gap={0.5} style={styles.wrap}>
        <Typography size="text-xs" color="secondary">
          {label}
        </Typography>
        <Pressable
          onPress={openPicker}
          style={styles.field}
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${displayValue}`}
        >
          <Icon size={18} color={theme.colors.primary} />
          <Typography
            weight="semibold"
            size="text-sm"
            numberOfLines={1}
            style={styles.value}
          >
            {displayValue}
          </Typography>
          <ChevronDownIcon size={16} color={theme.colors.textMuted} />
        </Pressable>
      </Flex>

      <Modal
        visible={open && Platform.OS === "ios"}
        transparent
        animationType="fade"
        onRequestClose={dismiss}
      >
        <View style={styles.modalRoot}>
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.backdropLayer}
          >
            <Pressable
              style={styles.backdrop(theme.colors.overlay)}
              onPress={dismiss}
              accessibilityRole="button"
              accessibilityLabel="Close picker"
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
                {label}
              </Typography>
              <IconButton
                icon={<XIcon />}
                variant="ghost"
                size="sm"
                accessibilityLabel="Close"
                onPress={dismiss}
              />
            </Flex>

            <View style={styles.pickerArea}>
              <DateTimePicker
                value={draftDate}
                mode={mode}
                display="spinner"
                minimumDate={minimumDate}
                onChange={handleDraftChange}
                themeVariant="light"
                style={[styles.picker, { width: pickerWidth }]}
              />
            </View>

            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <Button size="xl" fullWidth onPress={commitDraft}>
                Done
              </Button>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {open && Platform.OS === "android" ? (
        <DateTimePicker
          value={androidPickerValue}
          mode={mode}
          display="default"
          minimumDate={minimumDate}
          onChange={handleAndroidChange}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  wrap: {
    minWidth: 0,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1),
    minHeight: 44,
    paddingHorizontal: space(1.5),
    paddingVertical: space(1),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  value: {
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
  sheetHeader: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
    paddingBottom: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
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
  footer: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
  },
}));
