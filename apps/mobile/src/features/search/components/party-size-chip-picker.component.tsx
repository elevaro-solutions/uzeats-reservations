import { useState } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Flex, Typography } from "@/components";

const PRESET_SIZES = [2, 4, 6, 8] as const;
const MIN_PARTY = 9;
const MAX_PARTY = 50;

export type PartySizeChipPickerProps = {
  value: number;
  onChange: (value: number) => void;
};

function isPresetSize(size: number): size is (typeof PRESET_SIZES)[number] {
  return (PRESET_SIZES as readonly number[]).includes(size);
}

function GuestSizeCard({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { theme } = useUnistyles();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: selected ? theme.colors.secondary : theme.colors.slate2,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
    >
      <Typography
        weight="semibold"
        size="text-lg"
        color={selected ? "inverse" : "secondary"}
      >
        {label}
      </Typography>
    </Pressable>
  );
}

export function PartySizeChipPicker({ value, onChange }: PartySizeChipPickerProps) {
  const { theme } = useUnistyles();
  const [largePartyActive, setLargePartyActive] = useState(() => value >= MIN_PARTY);

  function selectPreset(size: number) {
    setLargePartyActive(false);
    onChange(size);
  }

  function selectLargeParty() {
    setLargePartyActive(true);
    if (isPresetSize(value) || value < MIN_PARTY) {
      onChange(MIN_PARTY);
    }
  }

  function increment() {
    onChange(Math.min(MAX_PARTY, value + 1));
  }

  function decrement() {
    onChange(Math.max(MIN_PARTY, value - 1));
  }

  return (
    <Flex gap={2.5} style={styles.wrapper}>
      <Flex gap={1.25}>
        <Flex direction="row" gap={1.25}>
          {PRESET_SIZES.slice(0, 2).map((size) => (
            <GuestSizeCard
              key={size}
              label={String(size)}
              selected={!largePartyActive && value === size}
              onPress={() => selectPreset(size)}
              accessibilityLabel={`${size} guests`}
            />
          ))}
        </Flex>
        <Flex direction="row" gap={1.25}>
          {PRESET_SIZES.slice(2).map((size) => (
            <GuestSizeCard
              key={size}
              label={String(size)}
              selected={!largePartyActive && value === size}
              onPress={() => selectPreset(size)}
              accessibilityLabel={`${size} guests`}
            />
          ))}
        </Flex>
        <GuestSizeCard
          label="9+"
          selected={largePartyActive}
          onPress={selectLargeParty}
          accessibilityLabel={
            largePartyActive
              ? `${value} guests, large party`
              : "9 or more guests"
          }
        />
      </Flex>

      {largePartyActive ? (
        <View style={styles.stepperCard(theme.colors.slate2)}>
          <Flex direction="row" alignItems="center" justifyContent="center" gap={2.5}>
            <Pressable
              onPress={decrement}
              disabled={value <= MIN_PARTY}
              style={styles.stepperBtn(
                theme.colors.background,
                value <= MIN_PARTY,
              )}
              accessibilityRole="button"
              accessibilityLabel="Decrease party size"
            >
              <Typography weight="bold" size="text-xl">
                −
              </Typography>
            </Pressable>
            <Flex alignItems="center" gap={0.25} style={styles.stepperValue}>
              <Typography weight="bold" size="text-xl">
                {value}
              </Typography>
              <Typography size="text-xs" color="secondary">
                guest{value === 1 ? "" : "s"}
              </Typography>
            </Flex>
            <Pressable
              onPress={increment}
              disabled={value >= MAX_PARTY}
              style={styles.stepperBtn(
                theme.colors.background,
                value >= MAX_PARTY,
              )}
              accessibilityRole="button"
              accessibilityLabel="Increase party size"
            >
              <Typography weight="bold" size="text-xl">
                +
              </Typography>
            </Pressable>
          </Flex>
        </View>
      ) : null}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius }) => ({
  wrapper: {
    alignSelf: "stretch",
  },
  card: {
    flex: 1,
    alignSelf: "stretch",
    minHeight: space(8),
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperCard: (backgroundColor: string) => ({
    backgroundColor,
    borderRadius: radius.lg,
    paddingVertical: space(2.5),
    paddingHorizontal: space(2),
  }),
  stepperValue: {
    minWidth: space(10),
  },
  stepperBtn: (backgroundColor: string, disabled: boolean) => ({
    width: space(6),
    height: space(6),
    borderRadius: radius.full,
    backgroundColor,
    alignItems: "center",
    justifyContent: "center",
    opacity: disabled ? 0.4 : 1,
  }),
}));
