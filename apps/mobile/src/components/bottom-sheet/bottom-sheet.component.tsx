import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { XIcon } from "@/assets";

import { Flex } from "../flex";
import { IconButton } from "../icon-button";
import { Typography } from "../typography";

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  showHandle?: boolean;
  showCloseButton?: boolean;
  headerBorder?: boolean;
  maxHeight?: number | `${number}%`;
  minHeight?: number;
  dismissOnBackdrop?: boolean;
  loading?: boolean;
  keyboardAvoiding?: boolean;
  scrollable?: boolean;
  /** Apply default body padding/gap. Default true. Set false for full-bleed pickers. */
  padded?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function BottomSheet({
  visible,
  onClose,
  title,
  description,
  children,
  footer,
  showHandle = false,
  showCloseButton,
  headerBorder = false,
  maxHeight = "85%",
  minHeight,
  dismissOnBackdrop,
  loading = false,
  keyboardAvoiding = false,
  scrollable = false,
  padded = true,
  contentContainerStyle,
  accessibilityLabel = "Close",
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  const canDismiss = dismissOnBackdrop ?? !loading;
  const showClose = showCloseButton ?? Boolean(title);
  const showHeader = Boolean(title || description || showClose);
  const bottomPad = Math.max(insets.bottom, theme.space(2));

  const Root = keyboardAvoiding ? KeyboardAvoidingView : View;
  const rootProps = keyboardAvoiding
    ? {
        style: styles.modalRoot,
        behavior: Platform.OS === "ios" ? ("padding" as const) : undefined,
      }
    : { style: styles.modalRoot };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={canDismiss ? onClose : undefined}
    >
      <Root {...rootProps}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.backdropLayer}
        >
          <Pressable
            style={styles.backdrop(theme.colors.overlay)}
            onPress={canDismiss ? onClose : undefined}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
          />
        </Animated.View>

        <Animated.View
          entering={SlideInDown.duration(280)}
          exiting={SlideOutDown.duration(220)}
          style={[
            styles.sheet(theme.colors.background),
            { maxHeight, minHeight },
            !footer ? { paddingBottom: bottomPad } : null,
          ]}
        >
          {showHandle ? (
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>
          ) : null}

          {showHeader ? (
            <Flex
              direction="row"
              alignItems={description ? "flex-start" : "center"}
              justifyContent="space-between"
              style={[styles.header, headerBorder && styles.headerBorder]}
            >
              <View style={styles.headerTitleBlock}>
                {title ? (
                  <Typography size="text-xl" weight="bold">
                    {title}
                  </Typography>
                ) : null}
                {description ? (
                  <Typography size="text-sm" color="secondary">
                    {description}
                  </Typography>
                ) : null}
              </View>
              {showClose ? (
                <IconButton
                  icon={<XIcon />}
                  variant="ghost"
                  size="sm"
                  accessibilityLabel="Close"
                  onPress={onClose}
                  disabled={loading}
                />
              ) : null}
            </Flex>
          ) : null}

          {scrollable ? (
            <ScrollView
              bounces
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              style={styles.bodyScroll}
              contentContainerStyle={[
                padded ? styles.body : null,
                contentContainerStyle,
              ]}
            >
              {children}
            </ScrollView>
          ) : children ? (
            <View
              style={[padded ? styles.body : null, contentContainerStyle]}
            >
              {children}
            </View>
          ) : null}

          {footer ? (
            <View style={[styles.footer, { paddingBottom: bottomPad }]}>
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </Root>
    </Modal>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: (overlay: string) => ({
    flex: 1,
    backgroundColor: overlay,
  }),
  sheet: (backgroundColor: string) => ({
    width: "100%",
    backgroundColor,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: "hidden",
  }),
  handleRow: {
    alignItems: "center",
    paddingTop: space(1.25),
    paddingBottom: space(0.5),
  },
  handle: {
    width: space(5),
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.slate5,
  },
  header: {
    paddingHorizontal: space(2.5),
    paddingTop: space(2.5),
    paddingBottom: space(2),
    flexShrink: 0,
  },
  headerBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
  },
  headerTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: space(0.5),
    paddingRight: space(1),
  },
  // Shrink when the sheet hits maxHeight so content can scroll.
  bodyScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  body: {
    paddingHorizontal: space(2.5),
    paddingTop: space(2.5),
    paddingBottom: space(2),
    gap: space(2.5),
  },
  footer: {
    paddingHorizontal: space(2.5),
    paddingTop: space(2),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
    flexShrink: 0,
  },
}));
