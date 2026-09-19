import { useState } from "react";
import { Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { CheckIcon, ChevronDownIcon } from "@/assets";
import { BottomSheet, Flex, Typography } from "@/components";

export const FLOOR_AREA_ALL = "__all__";

export type FloorAreaPickerProps = {
  areas: string[];
  value: string;
  onChange: (area: string) => void;
};

export function FloorAreaPicker({
  areas,
  value,
  onChange,
}: FloorAreaPickerProps) {
  const { theme } = useUnistyles();
  const [open, setOpen] = useState(false);

  if (areas.length < 2) return null;

  const label = value === FLOOR_AREA_ALL ? "All areas" : value;
  const options = [
    { value: FLOOR_AREA_ALL, label: "All areas" },
    ...areas.map((area) => ({ value: area, label: area })),
  ];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Floor area: ${label}. Tap to change.`}
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.triggerPressed,
        ]}
      >
        <Typography
          weight="medium"
          size="text-md"
          color="secondary"
          numberOfLines={1}
          style={styles.label}
        >
          {label}
        </Typography>
        <ChevronDownIcon size={18} color={theme.colors.textSecondary} />
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Floor area"
        showHandle
        headerBorder
        scrollable
      >
        <Flex gap={0.5}>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
              >
                <Typography
                  weight={selected ? "semibold" : "medium"}
                  size="text-md"
                  style={styles.optionLabel}
                >
                  {option.label}
                </Typography>
                {selected ? (
                  <CheckIcon size={20} color={theme.colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </Flex>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(0.25),
    maxWidth: "55%",
    paddingVertical: space(1),
    paddingLeft: space(1),
  },
  triggerPressed: {
    opacity: 0.7,
  },
  label: {
    flexShrink: 1,
    lineHeight: 22,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: space(6.5),
    paddingVertical: space(1.5),
    paddingHorizontal: space(2),
    borderRadius: radius.md,
    backgroundColor: "transparent",
  },
  optionSelected: {
    backgroundColor: colors.primary2,
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionLabel: {
    flex: 1,
    flexShrink: 1,
    paddingRight: space(1),
  },
}));
