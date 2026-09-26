import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { BellIcon } from "@/assets";
import { Button, Empty } from "@/components";

export type NotificationsAuthGateProps = {
  mode: "offline" | "signed-out";
  retryingSession: boolean;
  onRetrySession: () => void;
  onSignIn: () => void;
};

export function NotificationsAuthGate({
  mode,
  retryingSession,
  onRetrySession,
  onSignIn,
}: NotificationsAuthGateProps) {
  const { theme } = useUnistyles();
  const isOffline = mode === "offline";

  return (
    <View style={styles.padX}>
      <Empty
        icon={<BellIcon size={28} color={theme.colors.textMuted} />}
        title={isOffline ? "You're offline" : "Sign in to see notifications"}
        description={
          isOffline
            ? "We couldn't restore your session. Check your connection and try again."
            : "Floor alerts and reservation updates will show up here."
        }
      />
      <Button
        fullWidth
        loading={isOffline ? retryingSession : false}
        onPress={isOffline ? onRetrySession : onSignIn}
        style={styles.signInBtn}
      >
        {isOffline ? "Try again" : "Sign in"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  padX: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
  },
  signInBtn: {
    marginTop: space(2),
  },
}));
