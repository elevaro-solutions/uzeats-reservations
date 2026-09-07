import { ComponentType } from "react";
import { Pressable, ScrollView } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import {
  BriefcaseIcon,
  CakeIcon,
  HeartIcon,
  PartyPopperIcon,
  SparklesIcon,
  WineIcon,
} from "@/assets";
import { Flex, Input, Typography } from "@/components";
import { IconPropsType } from "@/types";
import {
  BOOKABLE_OCCASIONS,
  OCCASION_LABELS,
  type Occasion,
} from "@reservations/shared";

import { BookingSection } from "./booking-section.component";

const OCCASION_ROWS = splitIntoRows(BOOKABLE_OCCASIONS, 2);

const OCCASION_ICONS: Partial<
  Record<Occasion, ComponentType<IconPropsType>>
> = {
  date: HeartIcon,
  birthday: CakeIcon,
  anniversary: WineIcon,
  business: BriefcaseIcon,
  celebration: PartyPopperIcon,
  other: SparklesIcon,
};

export type BookingPreferencesSectionProps = {
  occasion: Occasion;
  notes: string;
  onOccasionChange: (value: Occasion) => void;
  onNotesChange: (value: string) => void;
};

export function BookingPreferencesSection({
  occasion,
  notes,
  onOccasionChange,
  onNotesChange,
}: BookingPreferencesSectionProps) {
  return (
    <BookingSection title="Booking preferences">
      <Input
        label="Comment for restaurant"
        value={notes}
        onChangeText={onNotesChange}
        placeholder="Allergies, seating preferences…"
        multiline
        numberOfLines={4}
        maxLength={500}
      />

      <Flex gap={1.25}>
        <Typography size="text-xs" weight="medium" color="secondary">
          Occasion
        </Typography>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.occasionScrollView}
          contentContainerStyle={styles.occasionScrollContent}
        >
          <Flex gap={1.25} alignItems="flex-start">
            {OCCASION_ROWS.map((row) => (
              <Flex
                key={row.join("-")}
                direction="row"
                gap={1.25}
                alignItems="flex-start"
              >
                {row.map((value) => (
                  <OccasionChip
                    key={value}
                    value={value}
                    selected={occasion === value}
                    onPress={() => onOccasionChange(value)}
                  />
                ))}
              </Flex>
            ))}
          </Flex>
        </ScrollView>
      </Flex>
    </BookingSection>
  );
}

function splitIntoRows<T>(items: readonly T[], rowCount: number): T[][] {
  const rows: T[][] = Array.from({ length: rowCount }, () => []);
  items.forEach((item, index) => {
    rows[index % rowCount].push(item);
  });
  return rows;
}

function OccasionChip({
  value,
  selected,
  onPress,
}: {
  value: Occasion;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();
  const Icon = OCCASION_ICONS[value];
  const label = OCCASION_LABELS[value];
  const accentColor = selected
    ? theme.colors.white
    : theme.colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.occasionChip,
        selected && styles.occasionChipSelected,
        pressed && styles.occasionChipPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Flex direction="row" alignItems="center" gap={0.5}>
        {Icon ? <Icon size={16} color={accentColor} /> : null}
        <Typography
          size="text-sm"
          weight="semibold"
          color={selected ? "inverse" : "textPrimary"}
        >
          {label}
        </Typography>
      </Flex>
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  occasionScrollView: {
    marginHorizontal: -space(2),
  },
  occasionScrollContent: {
    gap: space(1),
    paddingHorizontal: space(2),
  },
  occasionChip: {
    alignSelf: "flex-start",
    flexShrink: 0,
    paddingVertical: space(0.75),
    paddingHorizontal: space(1.5),
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.slate3,
    backgroundColor: colors.slate1,
  },
  occasionChipSelected: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondary,
  },
  occasionChipPressed: {
    opacity: 0.85,
  },
}));
