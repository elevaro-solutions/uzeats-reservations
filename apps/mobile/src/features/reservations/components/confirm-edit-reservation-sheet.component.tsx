import { BottomSheet, Button, Flex } from "@/components";

export type ConfirmEditReservationSheetProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
};

export function ConfirmEditReservationSheet({
  visible,
  onClose,
  onConfirm,
  loading = false,
}: ConfirmEditReservationSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Save changes?"
      description="Are you sure you want to update this reservation?"
      loading={loading}
      accessibilityLabel="Close confirmation"
      footer={
        <Flex gap={1.5}>
          <Button
            fullWidth
            size="xl"
            loading={loading}
            disabled={loading}
            onPress={onConfirm}
          >
            Confirm changes
          </Button>
          <Button
            fullWidth
            size="xl"
            variant="outlined"
            disabled={loading}
            onPress={onClose}
          >
            Keep editing
          </Button>
        </Flex>
      }
    />
  );
}
