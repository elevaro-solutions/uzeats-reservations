import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ClockIcon } from "@/assets";
import { Button, Dialog, Typography } from "@/components";

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
    <Dialog
      visible={visible}
      onClose={onClose}
      title="You're on the waitlist"
      description="If a table opens for your party, we'll notify you. There's no charge, and you can leave the waitlist anytime."
      icon={
        <View style={styles.iconCircle}>
          <ClockIcon size={32} color={theme.colors.secondary} />
        </View>
      }
      actions={
        <Button
          fullWidth
          size="lg"
          variant="filled"
          color="secondary"
          onPress={onClose}
        >
          Got it
        </Button>
      }
    >
      {meta ? (
        <Typography size="text-sm" weight="semibold" align="center">
          {meta}
        </Typography>
      ) : null}
    </Dialog>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  iconCircle: {
    width: space(7),
    height: space(7),
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.slate2,
    marginBottom: space(0.5),
  },
}));
