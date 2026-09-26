import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Flex } from "@/components/flex";
import { Typography } from "@/components/typography";
import { MAX_BOOKABLE_PARTY_SIZE } from "@/lib/party-size";

const MIN_PARTY = 1;

export type PartySizeStepperProps = {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
};

export function PartySizeStepper({
  value,
  onChange,
  label = "Party size",
  required = false,
  error = false,
  helperText,
}: PartySizeStepperProps) {
  const { theme } = useUnistyles();
  styles.useVariants({ error });

  function increment() {
    onChange(Math.min(MAX_BOOKABLE_PARTY_SIZE, value + 1));
  }

  function decrement() {
    onChange(Math.max(MIN_PARTY, value - 1));
  }

  return (
    <View style={styles.container}>
      {label ? (
        <Typography size="text-sm" weight="medium" style={styles.label}>
          {label}
          {required ? (
            <Typography size="text-sm" color="error">
              {" "}
              *
            </Typography>
          ) : null}
        </Typography>
      ) : null}

      <View style={styles.stepperCard}>
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

      {helperText ? (
        <Typography size="text-xs" style={styles.helperText}>
          {helperText}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  container: {
    width: "100%",
  },
  label: {
    color: colors.textPrimary,
    marginBottom: space(0.5),
  },
  stepperCard: {
    backgroundColor: colors.slate2,
    borderRadius: radius.lg,
    paddingVertical: space(2),
    paddingHorizontal: space(2),
    borderWidth: 1,
    borderColor: colors.slate3,
    variants: {
      error: {
        true: { borderColor: colors.error },
        false: {},
      },
    },
  },
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
  helperText: {
    marginTop: space(1),
    color: colors.textMuted,
    variants: {
      error: {
        true: { color: colors.errorPress },
        false: {},
      },
    },
  },
}));
