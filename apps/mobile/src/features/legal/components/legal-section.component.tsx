import { Linking } from "react-native";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native-unistyles";

import { Flex, Typography } from "@/components";

import {
  LEGAL_CONTACT,
  LEGAL_COOKIES_URL,
  LEGAL_SMS_URL,
} from "../helpers/legal.constants";
import type {
  LegalBlock,
  LegalLinkTarget,
  LegalSectionContent,
  LegalSegment,
} from "../helpers/legal.types";

type LegalSectionProps = {
  section: LegalSectionContent;
};

function resolveLink(target: LegalLinkTarget): string | { route: string } {
  switch (target) {
    case "privacy":
      return { route: "/privacy" };
    case "terms":
      return { route: "/terms" };
    case "cookies":
      return LEGAL_COOKIES_URL;
    case "sms":
      return LEGAL_SMS_URL;
    case "mailto-privacy":
      return `mailto:${LEGAL_CONTACT.privacy}`;
    case "mailto-legal":
      return `mailto:${LEGAL_CONTACT.legal}`;
  }
}

function LegalRichText({ segments }: { segments: LegalSegment[] }) {
  const router = useRouter();

  return (
    <Typography size="text-sm" color="secondary" style={styles.paragraph}>
      {segments.map((segment, index) => {
        if (segment.link) {
          const resolved = resolveLink(segment.link);
          return (
            <Typography
              key={`${segment.text}-${index}`}
              size="text-sm"
              weight="medium"
              color="primary"
              accessibilityRole="link"
              onPress={() => {
                if (typeof resolved === "string") {
                  Linking.openURL(resolved).catch(() => undefined);
                } else {
                  router.push(resolved.route as "/privacy" | "/terms");
                }
              }}
            >
              {segment.text}
            </Typography>
          );
        }

        if (segment.bold) {
          return (
            <Typography
              key={`${segment.text}-${index}`}
              size="text-sm"
              weight="semibold"
              color="textPrimary"
            >
              {segment.text}
            </Typography>
          );
        }

        return segment.text;
      })}
    </Typography>
  );
}

function LegalBlockView({ block }: { block: LegalBlock }) {
  if (block.kind === "bullets") {
    return (
      <Flex gap={0.75} style={styles.bulletList}>
        {block.items.map((item) => (
          <Flex key={item} direction="row" gap={1} style={styles.bulletRow}>
            <Typography size="text-sm" color="secondary">
              •
            </Typography>
            <Typography
              size="text-sm"
              color="secondary"
              style={styles.bulletText}
            >
              {item}
            </Typography>
          </Flex>
        ))}
      </Flex>
    );
  }

  return <LegalRichText segments={block.segments} />;
}

export function LegalSection({ section }: LegalSectionProps) {
  return (
    <Flex gap={1.25}>
      <Typography size="text-lg" weight="semibold">
        {section.title}
      </Typography>
      <Flex gap={1}>
        {section.blocks.map((block, index) => (
          <LegalBlockView key={`${section.id}-${index}`} block={block} />
        ))}
      </Flex>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  paragraph: {
    lineHeight: 22,
  },
  bulletList: {
    paddingLeft: space(0.25),
  },
  bulletRow: {
    alignItems: "flex-start",
  },
  bulletText: {
    flex: 1,
    lineHeight: 22,
  },
}));
