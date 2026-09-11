import type { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex } from "../flex";
import { Typography } from "../typography";

export type DialogProps = {
  visible: boolean;
  onClose: () => void;
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  actions: ReactNode;
  dismissOnBackdrop?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
};

export function Dialog({
  visible,
  onClose,
  icon,
  title,
  description,
  children,
  actions,
  dismissOnBackdrop,
  loading = false,
  accessibilityLabel = "Dismiss",
}: DialogProps) {
  const canDismiss = dismissOnBackdrop ?? !loading;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={canDismiss ? onClose : undefined}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropDismiss}
          onPress={canDismiss ? onClose : undefined}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        />
        <View style={styles.card}>
          {icon ? icon : null}

          <Typography size="text-xl" weight="bold" align="center">
            {title}
          </Typography>

          {description ? (
            <Typography
              size="text-sm"
              color="secondary"
              align="center"
              style={styles.description}
            >
              {description}
            </Typography>
          ) : null}

          {children}

          <Flex style={styles.actions}>{actions}</Flex>
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
  description: {
    marginBottom: space(0.5),
  },
  actions: {
    width: "100%",
    marginTop: space(0.5),
  },
}));
