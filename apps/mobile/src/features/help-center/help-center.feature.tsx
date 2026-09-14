import { useRouter } from "expo-router";
import { type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChevronLeftIcon } from "@/assets";
import { Flex, IconButton, Typography } from "@/components";

import { HelpContactSection } from "./components/help-contact-section.component";
import { HelpFaqAccordion } from "./components/help-faq-accordion.component";
import { HELP_FAQ_ITEMS } from "./helpers/help-center.content";

function HelpSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Flex gap={1.5}>
      <Flex gap={0.5}>
        <Typography size="text-lg" weight="semibold">
          {title}
        </Typography>
        <Typography size="text-sm" color="secondary">
          {description}
        </Typography>
      </Flex>
      {children}
    </Flex>
  );
}

export function HelpCenterFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Flex direction="row" alignItems="center" style={styles.topBar}>
        <IconButton
          icon={<ChevronLeftIcon />}
          variant="surface"
          size="sm"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          style={styles.chromeBtn}
        />
        <Typography weight="semibold" size="text-lg" style={styles.topTitle}>
          Help center
        </Typography>
        <View style={styles.sideSlot} />
      </Flex>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              Math.max(insets.bottom, theme.space(2)) + theme.space(2),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HelpSection
          title="FAQ"
          description="Quick answers about bookings, favorites, and your account."
        >
          <HelpFaqAccordion items={HELP_FAQ_ITEMS} />
        </HelpSection>

        <HelpSection
          title="Contact"
          description="We usually reply within 1–2 business days."
        >
          <HelpContactSection />
        </HelpSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
  },
  chromeBtn: {
    width: space(5),
    height: space(5),
    borderRadius: radius.full,
  },
  sideSlot: {
    width: space(5),
    height: space(5),
  },
  content: {
    paddingHorizontal: space(2),
    paddingTop: space(1),
    gap: space(4),
  },
}));
