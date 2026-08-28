import { type ComponentType } from "react";
import { Pressable, ScrollView } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Flex, MealTileSkeleton, Typography } from "@/components";
import { SectionHeader } from "@/features/home/components/section-header.component";
import { CroissantIcon } from "@/features/home/icons/dining-style-icons";
import type { IconPropsType } from "@/types";

import {
  CoffeeMealIcon,
  MoonMealIcon,
  SoupMealIcon,
  SunMealIcon,
} from "../icons/meal-icons";
import type { DiscoveryIndexEntry } from "../types";

const MEAL_ICONS: Record<string, ComponentType<IconPropsType>> = {
  Breakfast: CoffeeMealIcon,
  Brunch: CroissantIcon,
  Lunch: SoupMealIcon,
  Dinner: MoonMealIcon,
};

export type DiscoveryMealsSectionProps = {
  loading: boolean;
  meals: DiscoveryIndexEntry[];
  onPress: (label: string) => void;
};

export function DiscoveryMealsSection({
  loading,
  meals,
  onPress,
}: DiscoveryMealsSectionProps) {
  const { theme } = useUnistyles();

  if (!loading && meals.length === 0) return null;

  return (
    <Flex gap={1.5}>
      <SectionHeader title="Meals" />
      {loading && meals.length === 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          <Flex direction="row" gap={1}>
            {[1, 2, 3, 4].map((i) => (
              <MealTileSkeleton key={i} />
            ))}
          </Flex>
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          <Flex direction="row" gap={1}>
            {meals.map((meal) => {
              const Icon = MEAL_ICONS[meal.label] ?? SunMealIcon;
              return (
                <Pressable
                  key={meal.slug}
                  onPress={() => onPress(meal.label)}
                  style={styles.mealTile}
                  accessibilityRole="button"
                  accessibilityLabel={meal.label}
                >
                  <Icon size={22} color={theme.colors.primary} />
                  <Typography weight="semibold" size="text-sm" numberOfLines={1}>
                    {meal.label}
                  </Typography>
                </Pressable>
              );
            })}
          </Flex>
        </ScrollView>
      )}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  chipScroll: {
    paddingHorizontal: space(2),
  },
  mealTile: {
    minWidth: 88,
    paddingVertical: space(1.5),
    paddingHorizontal: space(1.5),
    borderRadius: radius.lg,
    backgroundColor: colors.slate2,
    alignItems: "center",
    gap: space(1),
  },
}));
