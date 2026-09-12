import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { BottomSheet, Button, Flex } from "@/components";

export type SignOutConfirmationSheetProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
};

export function SignOutConfirmationSheet({
  visible,
  onClose,
  onConfirm,
  loading = false,
}: SignOutConfirmationSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Sign out?"
      description="You will need to sign in again to manage reservations and loyalty."
      loading={loading}
      accessibilityLabel="Close sign out confirmation"
      footer={
        <Flex direction="row" gap={1.5}>
          <View style={styles.footerBtn}>
            <Button
              fullWidth
              size="xl"
              variant="outlined"
              color="secondary"
              disabled={loading}
              onPress={onClose}
            >
              Cancel
            </Button>
          </View>
          <View style={styles.footerBtn}>
            <Button
              fullWidth
              size="xl"
              color="error"
              loading={loading}
              disabled={loading}
              onPress={onConfirm}
            >
              Sign out
            </Button>
          </View>
        </Flex>
      }
    />
  );
}

const styles = StyleSheet.create(() => ({
  footerBtn: {
    flex: 1,
    minWidth: 0,
  },
}));
