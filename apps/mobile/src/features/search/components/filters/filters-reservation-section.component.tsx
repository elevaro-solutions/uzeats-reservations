import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Chip, DateTimeField, Flex, Typography } from "@/components";
import { TIME_PRESETS } from "@/lib/helpers/date-time.helpers";

import { isPresetTime } from "../../helpers/filter-draft.helpers";
import { PartySizePicker } from "../party-size-picker.component";

export type FiltersReservationSectionProps = {
  date: string;
  time?: string;
  partySize: number;
  customTime: boolean;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string | undefined, custom: boolean) => void;
  onCustomTime: () => void;
  onPartySizeChange: (value: number) => void;
};

export function FiltersReservationSection({
  date,
  time,
  partySize,
  customTime,
  onDateChange,
  onTimeChange,
  onCustomTime,
  onPartySizeChange,
}: FiltersReservationSectionProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <View style={styles.reservationCard}>
      <Typography weight="semibold" size="text-sm">
        Reservation details
      </Typography>
      <Flex direction="row" gap={1}>
        <DateTimeField
          label="Date"
          mode="date"
          value={date}
          minimumDate={today}
          onChange={(value) => {
            if (value) onDateChange(value);
          }}
        />
        <DateTimeField
          label="Time"
          mode="time"
          value={time}
          onChange={(value) => onTimeChange(value, true)}
        />
      </Flex>

      <Flex gap={1}>
        <Typography size="text-xs" color="secondary">
          Popular times
        </Typography>
        <Flex direction="row" gap={1} flexWrap="wrap">
          {TIME_PRESETS.map((preset) => {
            const selected =
              preset.value === undefined
                ? !time
                : time === preset.value && !customTime;
            return (
              <Chip
                key={preset.label}
                selected={selected}
                onPress={() => onTimeChange(preset.value, false)}
              >
                {preset.label}
              </Chip>
            );
          })}
          <Chip
            selected={customTime || Boolean(time && !isPresetTime(time))}
            onPress={onCustomTime}
          >
            Custom
          </Chip>
        </Flex>
      </Flex>

      <PartySizePicker value={partySize} onChange={onPartySizeChange} />
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  reservationCard: {
    gap: space(1.5),
    padding: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
}));
