import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import {
  BottomSheet,
  Button,
  Chip,
  Flex,
  Input,
} from "@/components";
import { RESERVATION_CANCELLATION_REASONS } from "@reservations/shared";

export type CancelReservationModalProps = {
  visible: boolean;
  onClose: () => void;
  cancelReason?: string;
  cancelDetails: string;
  onReasonChange: (value: string | undefined) => void;
  onDetailsChange: (value: string) => void;
  onConfirm: () => void;
  loading: boolean;
};

export function CancelReservationModal({
  visible,
  onClose,
  cancelReason,
  cancelDetails,
  onReasonChange,
  onDetailsChange,
  onConfirm,
  loading,
}: CancelReservationModalProps) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Cancel reservation"
      description="Tell us why you are cancelling. This helps the restaurant plan."
      loading={loading}
      keyboardAvoiding
      scrollable
      accessibilityLabel="Close cancellation"
      contentContainerStyle={styles.body}
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
              Keep
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
              Cancel
            </Button>
          </View>
        </Flex>
      }
    >
      <Flex direction="row" gap={1} flexWrap="wrap" alignItems="flex-start">
        {RESERVATION_CANCELLATION_REASONS.map((reason) => (
          <Chip
            key={reason}
            size="sm"
            selected={cancelReason === reason}
            onPress={() => onReasonChange(reason)}
          >
            {reason}
          </Chip>
        ))}
      </Flex>
      <Input
        label="Additional details (optional)"
        value={cancelDetails}
        onChangeText={onDetailsChange}
        multiline
        editable={!loading}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  body: {
    paddingTop: space(0.5),
    paddingBottom: space(2.5),
  },
  footerBtn: {
    flex: 1,
    minWidth: 0,
  },
}));
