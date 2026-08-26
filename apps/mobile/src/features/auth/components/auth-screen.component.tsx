import { ReactNode } from "react";
import { Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useRouter } from "expo-router";

import { ChevronLeftIcon } from "@/assets";
import { Flex, Typography } from "@/components";

export type AuthScreenProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  showBack?: boolean;
};

export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
  showBack = true,
}: AuthScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  return (
    <Flex
      flex={1}
      style={[
        styles.screen,
        {
          paddingTop: insets.top + theme.space(1),
          paddingBottom: insets.bottom + theme.space(2),
        },
      ]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {showBack ? (
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)");
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          >
            <ChevronLeftIcon size={22} color={theme.colors.textPrimary} />
          </Pressable>
        ) : null}

        <Flex gap={1} style={styles.header}>
          <Typography size="display-xs" weight="bold">
            {title}
          </Typography>
          <Typography size="text-md" color="secondary">
            {subtitle}
          </Typography>
        </Flex>

        <Flex gap={2.5}>{children}</Flex>
      </ScrollView>

      {footer ? <Flex style={styles.footer}>{footer}</Flex> : null}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  screen: {
    backgroundColor: colors.background,
    paddingHorizontal: space(2.5),
  },
  content: {
    flexGrow: 1,
    paddingBottom: space(3),
  },
  back: {
    width: 40,
    height: 40,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space(2),
    borderRadius: radius.full,
    backgroundColor: colors.primary1,
  },
  backPressed: {
    backgroundColor: colors.primary2,
  },
  header: {
    marginBottom: space(3),
  },
  footer: {
    paddingTop: space(1.5),
  },
}));
