import { Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { StarIcon } from "@/assets";

import { Flex } from "../flex";

export type StarRatingInputProps = {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
  disabled?: boolean;
  centered?: boolean;
};

export function StarRatingInput({
  value,
  onChange,
  size = 36,
  disabled = false,
  centered = false,
}: StarRatingInputProps) {
  const { theme } = useUnistyles();

  return (
    <Flex
      direction="row"
      gap={size >= 44 ? 1 : 0.5}
      style={[styles.row, centered ? styles.rowCentered : undefined]}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const filled = starValue <= value;

        return (
          <Pressable
            key={starValue}
            disabled={disabled}
            onPress={() => onChange(starValue)}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${starValue} out of 5 stars`}
            accessibilityState={{ selected: filled }}
            hitSlop={8}
          >
            <StarIcon
              size={size}
              filled={filled}
              color={filled ? theme.colors.accent : theme.colors.border}
            />
          </Pressable>
        );
      })}
    </Flex>
  );
}

const styles = StyleSheet.create(() => ({
  row: {
    alignSelf: "flex-start",
  },
  rowCentered: {
    alignSelf: "center",
  },
}));
