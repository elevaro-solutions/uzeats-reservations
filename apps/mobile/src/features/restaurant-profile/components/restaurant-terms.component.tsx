import { StyleSheet as RNStyleSheet } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex, Typography } from "@/components";

import { DetailSection } from "./detail-section-header.component";

export type RestaurantTermsProps = {
  terms: string;
};

export function RestaurantTerms({ terms }: RestaurantTermsProps) {
  const trimmed = terms.trim();
  if (!trimmed) return null;

  const paragraphs = trimmed
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Flex style={styles.termsBlock}>
      <DetailSection title="Terms">
        <Flex gap={1.25}>
          {paragraphs.map((paragraph, index) => (
            <Typography key={index} size="text-sm" color="secondary" weight="regular">
              {paragraph}
            </Typography>
          ))}
        </Flex>
      </DetailSection>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  termsBlock: {
    paddingTop: space(2),
    borderTopWidth: RNStyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
}));
