import { Modal, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { NavigationIcon } from "@/assets";
import { Button, Flex, Typography } from "@/components";

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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.iconWell}>
            <NavigationIcon size={24} color={theme.colors.white} />
          </View>

          <Typography size="text-xl" weight="bold" align="center">
            Allow location access?
          </Typography>

          <Typography
            size="text-sm"
            color="secondary"
            align="center"
            style={styles.body}
          >
            Tablevera uses your location to show restaurants near you.
          </Typography>

          <Flex gap={1} style={styles.actions}>
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    paddingHorizontal: space(3),
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: space(2.5),
    paddingTop: space(3),
    paddingBottom: space(2.5),
    alignItems: "center",
    gap: space(1.5),
  },
  iconWell: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space(0.5),
  },
  body: {
    marginBottom: space(1),
  },
  actions: {
    width: "100%",
    marginTop: space(0.5),
  },
}));
