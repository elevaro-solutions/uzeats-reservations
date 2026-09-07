import { Modal, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ClockIcon } from "@/assets";
import { Button, Flex, Typography } from "@/components";

export type BookingWaitlistSuccessModalProps = {
  visible: boolean;
  onClose: () => void;
  position?: number | null;
  estimatedWaitMinutes?: number | null;
};

export function BookingWaitlistSuccessModal({
  visible,
  onClose,
  position,
  estimatedWaitMinutes,
}: BookingWaitlistSuccessModalProps) {
  const { theme } = useUnistyles();

  const metaParts: string[] = [];
  if (position != null) metaParts.push(`You're #${position}`);
  if (estimatedWaitMinutes != null) {
    metaParts.push(`about ${estimatedWaitMinutes} min`);
  }
  const meta = metaParts.join(" · ");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropDismiss}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <ClockIcon size={32} color={theme.colors.secondary} />
          </View>

          <Typography size="text-xl" weight="bold" align="center">
            You're on the waitlist
          </Typography>

          <Typography
            size="text-sm"
            color="secondary"
            align="center"
            style={styles.body}
          >
            If a table opens for your party, we'll notify you. There's no
            charge, and you can leave the waitlist anytime.
          </Typography>

          {meta ? (
            <Typography size="text-sm" weight="semibold" align="center">
              {meta}
            </Typography>
          ) : null}

          <Flex style={styles.actions}>
            <Button
              fullWidth
              size="lg"
              variant="filled"
              color="secondary"
              onPress={onClose}
            >
              Got it
            </Button>
          </Flex>
        </View>
      </View>
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
  backdropDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: space(2.5),
    paddingTop: space(3),
    paddingBottom: space(2.5),
    alignItems: "center",
    gap: space(1.5),
    zIndex: 1,
  },
  iconCircle: {
    width: space(7),
    height: space(7),
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.slate2,
    marginBottom: space(0.5),
  },
  body: {
    marginBottom: space(0.5),
  },
  actions: {
    width: "100%",
    marginTop: space(0.5),
  },
}));
