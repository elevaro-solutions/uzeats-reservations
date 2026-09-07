import { Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Chip, Flex, Typography } from "@/components";
import { MAX_BOOKABLE_PARTY_SIZE } from "@/lib/party-size";

const PRESET_SIZES = [1, 2, 3, 4, 5, 6, 7] as const;
const MIN_PARTY = 1;

export type PartySizePickerProps = {
  value: number;
  onChange: (value: number) => void;
};

export function PartySizePicker({ value, onChange }: PartySizePickerProps) {
  const { theme } = useUnistyles();
  const showStepper = value >= 8;

  function selectPreset(size: number) {
    onChange(size);
  }

  function increment() {
    onChange(Math.min(MAX_BOOKABLE_PARTY_SIZE, value + 1));
  }

  function decrement() {
    onChange(Math.max(MIN_PARTY, value - 1));
  }

  return (
    <Flex gap={1.5}>
      <Typography size="text-sm" weight="medium">
        Party size
      </Typography>
      <Flex direction="row" gap={1} flexWrap="wrap">
        {PRESET_SIZES.map((size) => (
          <Chip
            key={size}
            selected={value === size}
            onPress={() => selectPreset(size)}
          >
            {String(size)}
          </Chip>
        ))}
        <Chip
          selected={value >= 8}
          onPress={() => onChange(Math.max(8, value >= 8 ? value : 8))}
        >
          8+
        </Chip>
      </Flex>

      {showStepper ? (
        <Flex direction="row" alignItems="center" justifyContent="center" gap={2}>
          <Pressable
            onPress={decrement}
            style={styles.stepperBtn(theme.colors.slate2)}
            accessibilityRole="button"
            accessibilityLabel="Decrease party size"
          >
            <Typography weight="bold" size="text-lg">
              −
            </Typography>
          </Pressable>
          <Typography weight="semibold" size="text-lg">
            {value} guests
          </Typography>
          <Pressable
            onPress={increment}
            style={styles.stepperBtn(theme.colors.slate2)}
            accessibilityRole="button"
            accessibilityLabel="Increase party size"
          >
            <Typography weight="bold" size="text-lg">
              +
            </Typography>
          </Pressable>
        </Flex>
      ) : null}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius }) => ({
  stepperBtn: (backgroundColor: string) => ({
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor,
    alignItems: "center",
    justifyContent: "center",
  }),
}));
