import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronLeftIcon, ChevronRightIcon } from "@/assets";
import { Flex, IconButton, Typography } from "@/components";
import { parseIsoDate } from "@/lib/helpers/date-time.helpers";

import { getBookableDaysInMonth, BOOKING_MAX_DAYS_AHEAD } from "../helpers/time-slots.helpers";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const WEEKDAY_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

const PILL_WIDTH = 76;
const PILL_HEIGHT = 76;

export type BookingDateScrollerProps = {
  selectedDate: string;
  onSelectDate: (iso: string) => void;
  maxAdvanceDays?: number;
};

type ViewMonth = {
  year: number;
  month: number;
};

function monthFromIso(iso: string): ViewMonth {
  const parsed = parseIsoDate(iso);
  if (!parsed) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }
  return { year: parsed.getFullYear(), month: parsed.getMonth() };
}

function shiftMonth(viewMonth: ViewMonth, delta: number): ViewMonth {
  const date = new Date(viewMonth.year, viewMonth.month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function BookingDateScroller({
  selectedDate,
  onSelectDate,
  maxAdvanceDays = BOOKING_MAX_DAYS_AHEAD,
}: BookingDateScrollerProps) {
  const { theme } = useUnistyles();
  const scrollRef = useRef<ScrollView>(null);
  const [viewMonth, setViewMonth] = useState<ViewMonth>(() =>
    monthFromIso(selectedDate),
  );

  function monthHasBookableDays(month: ViewMonth): boolean {
    return (
      getBookableDaysInMonth(month.year, month.month, maxAdvanceDays).length > 0
    );
  }

  const bookableDays = getBookableDaysInMonth(
    viewMonth.year,
    viewMonth.month,
    maxAdvanceDays,
  );
  const monthLabel = `${MONTH_NAMES[viewMonth.month]} ${viewMonth.year}`;
  const canGoPrev = monthHasBookableDays(shiftMonth(viewMonth, -1));
  const canGoNext = monthHasBookableDays(shiftMonth(viewMonth, 1));

  useEffect(() => {
    setViewMonth(monthFromIso(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    if (bookableDays.length === 0) {
      const next = shiftMonth(viewMonth, 1);
      if (monthHasBookableDays(next)) {
        setViewMonth(next);
        return;
      }
      const prev = shiftMonth(viewMonth, -1);
      if (monthHasBookableDays(prev)) {
        setViewMonth(prev);
      }
    }
  }, [viewMonth, bookableDays.length, maxAdvanceDays]);

  useEffect(() => {
    const index = bookableDays.indexOf(selectedDate);
    if (index < 0 || !scrollRef.current) return;
    scrollRef.current.scrollTo({
      x: index * (PILL_WIDTH + theme.space(1)),
      animated: true,
    });
  }, [selectedDate, viewMonth, bookableDays, theme]);

  function goToPrevMonth() {
    if (!canGoPrev) return;
    const prev = shiftMonth(viewMonth, -1);
    setViewMonth(prev);
    const days = getBookableDaysInMonth(prev.year, prev.month, maxAdvanceDays);
    if (days.length > 0 && !days.includes(selectedDate)) {
      onSelectDate(days[0]!);
    }
  }

  function goToNextMonth() {
    if (!canGoNext) return;
    const next = shiftMonth(viewMonth, 1);
    setViewMonth(next);
    const days = getBookableDaysInMonth(next.year, next.month, maxAdvanceDays);
    if (days.length > 0 && !days.includes(selectedDate)) {
      onSelectDate(days[0]!);
    }
  }

  return (
    <View style={styles.wrapper}>
      <Flex
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        style={styles.monthRow}
      >
        <Typography weight="semibold" size="text-md">
          {monthLabel}
        </Typography>
        <Flex direction="row" gap={0.5}>
          <IconButton
            icon={<ChevronLeftIcon />}
            variant="surface"
            size="sm"
            disabled={!canGoPrev}
            accessibilityLabel="Previous month"
            onPress={goToPrevMonth}
            style={styles.monthNavBtn}
          />
          <IconButton
            icon={<ChevronRightIcon />}
            variant="surface"
            size="sm"
            disabled={!canGoNext}
            accessibilityLabel="Next month"
            onPress={goToNextMonth}
            style={styles.monthNavBtn}
          />
        </Flex>
      </Flex>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {bookableDays.map((iso) => {
          const date = parseIsoDate(iso);
          if (!date) return null;
          const selected = iso === selectedDate;
          const weekday = WEEKDAY_SHORT[date.getDay()];
          const dayNum = date.getDate();

          return (
            <Pressable
              key={iso}
              onPress={() => onSelectDate(iso)}
              style={[
                styles.pill,
                selected && {
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.primary,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${weekday} ${dayNum}`}
              accessibilityState={{ selected }}
            >
              <Typography
                size="text-xs"
                color={selected ? "inverse" : "secondary"}
              >
                {weekday}
              </Typography>
              <Typography
                weight="semibold"
                size="text-xl"
                color={selected ? "inverse" : "primary"}
              >
                {String(dayNum).padStart(2, "0")}
              </Typography>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  wrapper: {
    marginBottom: space(2),
  },
  monthRow: {
    paddingHorizontal: space(2),
    marginBottom: space(1.5),
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
  },
  scroll: {
    paddingHorizontal: space(2),
    gap: space(1),
  },
  pill: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: space(0.5),
  },
}));
