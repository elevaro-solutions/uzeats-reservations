import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChevronLeftIcon } from "@/assets";
import { Flex, IconButton, Typography } from "@/components";

import { LegalContactBlock } from "./components/legal-contact-block.component";
import { LegalRelatedCard } from "./components/legal-related-card.component";
import { LegalSection } from "./components/legal-section.component";
import { LEGAL_LAST_UPDATED } from "./helpers/legal.constants";
import { PRIVACY_POLICY_DOCUMENT } from "./helpers/privacy-policy.content";
import { TERMS_CONDITIONS_DOCUMENT } from "./helpers/terms-conditions.content";
import type { LegalDocument } from "./helpers/legal.types";

export type LegalDocumentKind = "privacy" | "terms";

const DOCUMENTS: Record<LegalDocumentKind, LegalDocument> = {
  privacy: PRIVACY_POLICY_DOCUMENT,
  terms: TERMS_CONDITIONS_DOCUMENT,
};

type LegalFeatureProps = {
  kind: LegalDocumentKind;
};

export function LegalFeature({ kind }: LegalFeatureProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const document = DOCUMENTS[kind];

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
          {document.title}
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
        <Flex gap={1}>
          <Typography size="text-sm" color="secondary" style={styles.subtitle}>
            {document.subtitle}
          </Typography>
          <Typography size="text-xs" color="muted">
            Last updated {LEGAL_LAST_UPDATED}
          </Typography>
        </Flex>

        {document.sections.map((section) => (
          <LegalSection key={section.id} section={section} />
        ))}

        <Flex gap={1.5}>
          <Typography size="text-lg" weight="semibold">
            Contact
          </Typography>
          <Typography size="text-sm" color="secondary">
            Reach Tablevera for privacy or legal questions.
          </Typography>
          <LegalContactBlock />
        </Flex>

        <LegalRelatedCard
          title={document.relatedLabel}
          description={document.relatedDescription}
          onPress={() => router.push(document.relatedRoute)}
        />
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
  subtitle: {
    lineHeight: 22,
  },
}));
