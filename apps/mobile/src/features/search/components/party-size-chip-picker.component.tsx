import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Flex, Typography } from "@/components";
import { MAX_BOOKABLE_PARTY_SIZE } from "@/lib/party-size";

const PRESET_SIZES = [2, 4, 6, 8] as const;
const MIN_PARTY = 1;

export type PartySizeChipPickerProps = {
  value: number;
  onChange: (value: number) => void;
};

function PopularSizeChip({
  size,
  selected,
  onPress,
}: {
  size: number;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.secondary : "transparent",
          borderColor: selected ? theme.colors.secondary : theme.colors.slate3,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${size} guests`}
    >
      <Typography
        weight="semibold"
        size="text-sm"
        color={selected ? "inverse" : "secondary"}
      >
        {size}
      </Typography>
    </Pressable>
  );
}

export function PartySizeChipPicker({ value, onChange }: PartySizeChipPickerProps) {
  const { theme } = useUnistyles();

  function increment() {
    onChange(Math.min(MAX_BOOKABLE_PARTY_SIZE, value + 1));
  }

  function decrement() {
    onChange(Math.max(MIN_PARTY, value - 1));
  }

  return (
    <Flex gap={2.5} style={styles.wrapper}>
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
            disabled={value >= MAX_BOOKABLE_PARTY_SIZE}
            style={styles.stepperBtn(
              theme.colors.background,
              value >= MAX_BOOKABLE_PARTY_SIZE,
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

      <Flex gap={1}>
        <Typography size="text-sm" color="secondary">
          Popular
        </Typography>
        <Flex direction="row" gap={1}>
          {PRESET_SIZES.map((size) => (
            <PopularSizeChip
              key={size}
              size={size}
              selected={value === size}
              onPress={() => onChange(size)}
            />
          ))}
        </Flex>
      </Flex>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius }) => ({
  wrapper: {
    alignSelf: "stretch",
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
  chip: {
    flex: 1,
    minHeight: space(4.5),
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
}));
