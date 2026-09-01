import { useState } from "react";
import { Pressable, StyleSheet as RNStyleSheet } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronDownIcon } from "@/assets";
import { Flex, Typography } from "@/components";

import type { RestaurantFaqItem } from "../types";

import { DetailSection } from "./detail-section-header.component";

export type RestaurantFaqProps = {
  items: RestaurantFaqItem[];
};

export function RestaurantFaq({ items }: RestaurantFaqProps) {
  const { theme } = useUnistyles();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <DetailSection title="FAQ">
      <Flex>
        {items.map((item, index) => {
          const open = openIndex === index;
          const isLast = index === items.length - 1;
          return (
            <Flex
              key={`${item.question}-${index}`}
              style={!isLast ? styles.item : undefined}
            >
              <Pressable
                onPress={() => setOpenIndex(open ? null : index)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={styles.question}
              >
                <Typography
                  weight="medium"
                  size="text-sm"
                  style={styles.questionText}
                >
                  {item.question}
                </Typography>
                <ChevronDownIcon
                  size={18}
                  color={theme.colors.textSecondary}
                  style={open ? styles.chevronOpen : undefined}
                />
              </Pressable>
              {open ? (
                <Typography
                  size="text-sm"
                  color="secondary"
                  weight="regular"
                  style={styles.answer}
                >
                  {item.answer}
                </Typography>
              ) : null}
            </Flex>
          );
        })}
      </Flex>
    </DetailSection>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  item: {
    borderBottomWidth: RNStyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  question: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space(1),
    paddingVertical: space(1.25),
  },
  questionText: {
    flex: 1,
  },
  answer: {
    paddingBottom: space(1.5),
  },
  chevronOpen: {
    transform: [{ rotate: "180deg" }],
  },
}));
