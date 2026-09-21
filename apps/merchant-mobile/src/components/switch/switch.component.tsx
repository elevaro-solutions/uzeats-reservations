import { Switch as RNSwitch } from "react-native";
import { useUnistyles } from "react-native-unistyles";

export type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function Switch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: SwitchProps) {
  const { theme } = useUnistyles();

  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{
        false: theme.colors.slate4,
        true: theme.colors.primary6,
      }}
      thumbColor={theme.colors.white}
      ios_backgroundColor={theme.colors.slate4}
    />
  );
}
