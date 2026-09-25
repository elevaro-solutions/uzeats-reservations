import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { BellIcon } from "@/assets";
import { Button, Dialog, Flex } from "@/components";

export type PushPermissionModalProps = {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onAllow: () => void;
};

export function PushPermissionModal({
  visible,
  loading,
  onClose,
  onAllow,
}: PushPermissionModalProps) {
  const { theme } = useUnistyles();

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      loading={loading}
      title="Stay updated on your plans?"
      description="Get alerts when your reservation changes, a table opens on the waitlist, or the restaurant sends you a message."
      icon={
        <View style={styles.iconWell}>
          <BellIcon size={24} color={theme.colors.white} />
        </View>
      }
      actions={
        <Flex gap={1}>
          <Button fullWidth size="lg" loading={loading} onPress={onAllow}>
            Enable alerts
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
