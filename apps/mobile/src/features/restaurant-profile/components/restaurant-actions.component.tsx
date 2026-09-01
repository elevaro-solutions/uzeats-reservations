import type { ReactNode } from "react";
import { Linking, Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { GlobeIcon, NavigationIcon, PhoneIcon } from "@/assets";
import { Flex, Typography } from "@/components";

import {
  buildDirectionsUrl,
  buildTelUrl,
  buildWebsiteUrl,
} from "../helpers/restaurant-links.helpers";
import type { RestaurantDetail } from "../types";

export type RestaurantActionsProps = {
  restaurant: RestaurantDetail;
};

type ActionItem = {
  key: string;
  label: string;
  icon: ReactNode;
  onPress: () => void;
};

export function RestaurantActions({ restaurant }: RestaurantActionsProps) {
  const { theme } = useUnistyles();

  const actions: ActionItem[] = [];

  if (restaurant.phone?.trim()) {
    actions.push({
      key: "call",
      label: "Call",
      icon: <PhoneIcon size={20} color={theme.colors.primary} />,
      onPress: () => {
        Linking.openURL(buildTelUrl(restaurant.phone!)).catch(() => undefined);
      },
    });
  }

  actions.push({
    key: "directions",
    label: "Directions",
    icon: <NavigationIcon size={20} color={theme.colors.primary} />,
    onPress: () => {
      Linking.openURL(
        buildDirectionsUrl(restaurant.address, restaurant.location),
      ).catch(() => undefined);
    },
  });

  if (restaurant.website?.trim()) {
    actions.push({
      key: "website",
      label: "Website",
      icon: <GlobeIcon size={20} color={theme.colors.primary} />,
      onPress: () => {
        Linking.openURL(buildWebsiteUrl(restaurant.website!)).catch(
          () => undefined,
        );
      },
    });
  }

  if (actions.length === 0) return null;

  return (
    <Flex direction="row" gap={1} style={styles.row}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.action,
            pressed ? styles.pressed : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          {action.icon}
          <Typography size="text-xs" weight="medium" color="primary">
            {action.label}
          </Typography>
        </Pressable>
      ))}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  row: {
    marginTop: space(0.5),
  },
  action: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space(0.75),
    paddingVertical: space(1.25),
    borderRadius: radius.md,
    backgroundColor: colors.primary2,
  },
  pressed: {
    opacity: 0.75,
  },
}));
