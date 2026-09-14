import { useState } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronDownIcon } from "@/assets";
import { Flex, Typography } from "@/components";

import type { HelpFaqItem } from "../helpers/help-center.content";

export type HelpFaqAccordionProps = {
  items: HelpFaqItem[];
};

export function HelpFaqAccordion({ items }: HelpFaqAccordionProps) {
  const { theme } = useUnistyles();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <Flex gap={1.25}>
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <View
            key={`${item.question}-${index}`}
            style={[styles.card, open && styles.cardOpen]}
          >
            <Pressable
              onPress={() => setOpenIndex(open ? null : index)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              style={({ pressed }) => [
                styles.question,
                pressed && styles.pressed,
              ]}
            >
              <Typography
                weight="semibold"
                size="text-sm"
                style={styles.questionText}
              >
                {item.question}
              </Typography>
              <View style={[styles.chevronWell, open && styles.chevronWellOpen]}>
                <ChevronDownIcon
                  size={16}
                  color={theme.colors.textSecondary}
                  style={open ? styles.chevronOpen : undefined}
                />
              </View>
            </Pressable>
            {open ? (
              <View style={styles.answer}>
                <Typography size="text-sm" color="secondary" weight="regular">
                  {item.answer}
                </Typography>
              </View>
            ) : null}
          </View>
        );
      })}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  cardOpen: {
    borderColor: colors.slate4,
  },
  question: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space(1.5),
    paddingVertical: space(1.75),
    paddingHorizontal: space(1.75),
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.85,
  },
  questionText: {
    flex: 1,
  },
  chevronWell: {
    width: space(3.5),
    height: space(3.5),
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.slate3,
  },
  chevronWellOpen: {
    backgroundColor: colors.slate4,
  },
  answer: {
    paddingHorizontal: space(1.75),
    paddingVertical: space(1.75),
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
  },
  chevronOpen: {
    transform: [{ rotate: "180deg" }],
  },
}));
