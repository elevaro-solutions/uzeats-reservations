import { useState } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronDownIcon } from "@/assets";
import { BottomSheet, Flex, Typography } from "@/components";

import { useActiveRestaurant } from "../hooks/use-active-restaurant.hook";

export type RestaurantSwitcherProps = {
  /** Slightly denser pill for tight headers. */
  compact?: boolean;
};

export function RestaurantSwitcher({
  compact = false,
}: RestaurantSwitcherProps) {
  const { theme } = useUnistyles();
  const [open, setOpen] = useState(false);
  const {
    restaurants,
    activeRestaurant,
    activeRestaurantId,
    setActiveRestaurantId,
    loading,
  } = useActiveRestaurant();

  const label =
    activeRestaurant?.name ?? (loading ? "Loading…" : "Select restaurant");
  const canSwitch = restaurants.length > 1;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={restaurants.length === 0}
        accessibilityRole="button"
        accessibilityLabel={
          canSwitch
            ? `Current restaurant: ${label}. Tap to switch.`
            : `Current restaurant: ${label}`
        }
        style={({ pressed }) => [
          styles.trigger,
          compact && styles.triggerCompact,
          pressed && canSwitch && styles.triggerPressed,
        ]}
      >
        <Typography
          weight="medium"
          size={compact ? "text-sm" : "text-md"}
          numberOfLines={1}
          style={styles.label}
        >
          {label}
        </Typography>
        {canSwitch ? (
          <ChevronDownIcon size={16} color={theme.colors.textSecondary} />
        ) : null}
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Switch restaurant"
        showHandle
        headerBorder
        scrollable
      >
        <Flex gap={1}>
          {restaurants.map((restaurant) => {
            const selected = restaurant.id === activeRestaurantId;
            return (
              <Pressable
                key={restaurant.id}
                onPress={() => {
                  setActiveRestaurantId(restaurant.id);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
              >
                <View style={styles.optionBody}>
                  <Typography
                    weight={selected ? "semibold" : "medium"}
                    size="text-md"
                  >
                    {restaurant.name}
                  </Typography>
                  {restaurant.address?.city ? (
                    <Typography size="text-sm" color="secondary">
                      {[restaurant.address.city, restaurant.address.state]
                        .filter(Boolean)
                        .join(", ")}
                    </Typography>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </Flex>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  trigger: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: space(0.5),
    minHeight: space(5),
    maxWidth: "100%",
    paddingVertical: space(1.25),
    paddingHorizontal: space(1.5),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  triggerCompact: {
    minHeight: space(4.5),
    paddingVertical: space(1),
    paddingHorizontal: space(1.25),
  },
  triggerPressed: {
    opacity: 0.72,
  },
  label: {
    flexShrink: 1,
  },
  option: {
    minHeight: space(7),
    paddingVertical: space(1.5),
    paddingHorizontal: space(2),
    borderRadius: radius.md,
    backgroundColor: colors.slate2,
  },
  optionSelected: {
    backgroundColor: colors.primary2,
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionBody: {
    gap: space(0.25),
  },
}));
