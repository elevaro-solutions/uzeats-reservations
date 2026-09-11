import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { NavigationIcon } from "@/assets";
import { Button, Dialog, Flex } from "@/components";

export type LocationPermissionModalProps = {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onAllow: () => void;
};

export function LocationPermissionModal({
  visible,
  loading,
  onClose,
  onAllow,
}: LocationPermissionModalProps) {
  const { theme } = useUnistyles();

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      loading={loading}
      title="Allow location access?"
      description="Tablevera uses your location to show restaurants near you."
      icon={
        <View style={styles.iconWell}>
          <NavigationIcon size={24} color={theme.colors.white} />
        </View>
      }
      actions={
        <Flex gap={1}>
          <Button fullWidth size="lg" loading={loading} onPress={onAllow}>
            Allow location
          </Button>
          <Button
            fullWidth
            size="md"
            variant="text"
            color="secondary"
            disabled={loading}
            onPress={onClose}
          >
            Not now
          </Button>
        </Flex>
      }
    />
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  iconWell: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space(0.5),
  },
}));
