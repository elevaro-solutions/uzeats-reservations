import { ComponentType } from "react";
import { Pressable } from "react-native";
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

import { BookingSectionCard } from "./booking-section-card.component";

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
  occasion: string;
  notes: string;
  onOccasionChange: (value: string) => void;
  onNotesChange: (value: string) => void;
};

export function BookingPreferencesSection({
  occasion,
  notes,
  onOccasionChange,
  onNotesChange,
}: BookingPreferencesSectionProps) {
  return (
    <BookingSectionCard title="Booking preferences">
      <Input
        label="Comment for restaurant"
        value={notes}
        onChangeText={onNotesChange}
        placeholder="Allergies, seating preferences…"
        multiline
        numberOfLines={3}
        maxLength={500}
        containerStyle={styles.notesInput}
        style={styles.notesField}
      />

      <Flex direction="row" gap={1} flexWrap="wrap">
        {BOOKABLE_OCCASIONS.map((value) => (
          <OccasionChip
            key={value}
            value={value}
            selected={occasion === value}
            onPress={() => onOccasionChange(value)}
          />
        ))}
      </Flex>
    </BookingSectionCard>
  );
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

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.occasionChip,
        selected && {
          borderColor: theme.colors.primary,
          borderWidth: 2,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Flex direction="row" alignItems="center" gap={0.5}>
        {Icon ? (
          <Icon size={16} color={theme.colors.textPrimary} />
        ) : null}
        <Typography size="text-sm" weight={selected ? "semibold" : "medium"}>
          {label}
        </Typography>
      </Flex>
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  notesInput: {
    gap: space(0.75),
  },
  notesField: {
    borderWidth: 0,
    borderBottomWidth: 1,
    borderRadius: 0,
    borderColor: colors.border,
    paddingHorizontal: 0,
    paddingVertical: space(0.75),
    minHeight: space(5),
    backgroundColor: colors.background,
  },
  occasionChip: {
    paddingVertical: space(0.75),
    paddingHorizontal: space(1.5),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
}));
