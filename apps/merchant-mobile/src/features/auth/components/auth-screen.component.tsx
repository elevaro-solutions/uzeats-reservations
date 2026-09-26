import { ReactNode } from "react";
import { Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useRouter } from "expo-router";

import { ChevronLeftIcon, TableveraLogo } from "@/assets";
import { Flex, Typography } from "@/components";

export type AuthScreenProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  showBack?: boolean;
  /** Full-color wordmark above the title (sign-in entry screens). */
  showLogo?: boolean;
  /** Short label under the logo, e.g. "Partner Hub". */
  eyebrow?: string;
};

export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
  showBack = true,
  showLogo = false,
  eyebrow,
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
        contentContainerStyle={[
          styles.content,
          !showBack && showLogo ? styles.entryContent : null,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {showBack ? (
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
            } else {
              router.replace("/(auth)/sign-in");
            }
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          >
            <ChevronLeftIcon size={22} color={theme.colors.textPrimary} />
          </Pressable>
        ) : null}

        {showLogo ? (
          <Flex gap={1.5} style={styles.brand}>
            <TableveraLogo height={32} />
            {eyebrow ? (
              <Typography size="text-sm" weight="semibold" color="primary">
                {eyebrow}
              </Typography>
            ) : null}
          </Flex>
        ) : null}

        <Flex gap={1} style={[styles.header, showLogo && styles.headerWithLogo]}>
          <Typography size="display-xs" weight="bold">
            {title}
          </Typography>
          <Typography size="text-md" color="secondary">
            {subtitle}
          </Typography>
        </Flex>

        <Flex gap={3}>{children}</Flex>
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
  entryContent: {
    paddingTop: space(2),
  },
  brand: {
    marginBottom: space(3),
  },
  back: {
    width: 40,
    height: 40,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space(2),
    borderRadius: radius.full,
    backgroundColor: colors.slate2,
  },
  backPressed: {
    backgroundColor: colors.slate3,
  },
  header: {
    marginBottom: space(4),
  },
  headerWithLogo: {
    marginBottom: space(3.5),
  },
  footer: {
    paddingTop: space(2),
    marginTop: space(1),
    marginHorizontal: -space(2.5),
    paddingHorizontal: space(2.5),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
  },
}));
