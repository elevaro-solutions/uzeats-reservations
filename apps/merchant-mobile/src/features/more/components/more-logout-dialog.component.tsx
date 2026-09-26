import { Button, Dialog, Flex } from "@/components";

export type MoreLogoutDialogProps = {
  visible: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function MoreLogoutDialog({
  visible,
  loading,
  onClose,
  onConfirm,
}: MoreLogoutDialogProps) {
  return (
    <Dialog
      visible={visible}
      onClose={() => {
        if (!loading) onClose();
      }}
      loading={loading}
      title="Log out?"
      description="You'll need to sign in again to manage reservations and the floor."
      actions={
        <Flex gap={1}>
          <Button
            fullWidth
            size="lg"
            color="error"
            loading={loading}
            onPress={onConfirm}
          >
            Log out
          </Button>
          <Button
            fullWidth
            size="md"
            variant="text"
            color="secondary"
            disabled={loading}
            onPress={onClose}
          >
            Stay signed in
          </Button>
        </Flex>
      }
    />
  );
}
