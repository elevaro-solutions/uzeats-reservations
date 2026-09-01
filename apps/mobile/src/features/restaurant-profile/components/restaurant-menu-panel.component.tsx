import { Linking } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Button, Empty, Flex, RemoteImage, Typography } from "@/components";

import { buildWebsiteUrl } from "../helpers/restaurant-links.helpers";
import { formatMenuPrice } from "../helpers/restaurant-profile.helpers";
import type { RestaurantDetail, RestaurantMenuItem } from "../types";

export type RestaurantMenuPanelProps = {
  restaurant: RestaurantDetail;
};

function MenuItemRow({ item }: { item: RestaurantMenuItem }) {
  const price = formatMenuPrice(item.priceCents);
  const description = item.description?.trim();
  const photoUrl = item.photoUrl?.trim();

  return (
    <Flex direction="row" gap={1.5} alignItems="center">
      {photoUrl ? (
        <RemoteImage
          uri={photoUrl}
          style={styles.photo}
          recyclingKey={item.id}
        />
      ) : null}

      <Flex flex={1} gap={0.25} style={styles.itemBody}>
        <Typography weight="medium" size="text-md">
          {item.name}
        </Typography>
        {description ? (
          <Typography size="text-xs" color="secondary" numberOfLines={2}>
            {description}
          </Typography>
        ) : null}
      </Flex>

      {price ? (
        <Typography weight="semibold" size="text-sm" style={styles.price}>
          {price}
        </Typography>
      ) : null}
    </Flex>
  );
}

export function RestaurantMenuPanel({ restaurant }: RestaurantMenuPanelProps) {
  const sections = (restaurant.menu?.sections ?? []).filter(
    (s) => (s.items?.length ?? 0) > 0,
  );
  const externalUrl = restaurant.menuUrl?.trim() || restaurant.website?.trim();

  if (sections.length === 0) {
    return (
      <Empty
        title="Menu coming soon"
        description={
          externalUrl
            ? "This restaurant hasn’t published a menu in the app yet."
            : "Check back later for dishes and prices."
        }
      >
        {externalUrl ? (
          <Button
            variant="outlined"
            color="secondary"
            onPress={() => {
              Linking.openURL(buildWebsiteUrl(externalUrl)).catch(
                () => undefined,
              );
            }}
          >
            View menu online
          </Button>
        ) : null}
      </Empty>
    );
  }

  return (
    <Flex gap={3.5}>
      {sections.map((section) => (
        <Flex key={section.id} gap={1.5}>
          <Typography weight="semibold" size="text-md">
            {section.name}
          </Typography>
          <Flex gap={1.5}>
            {section.items.map((item) => (
              <MenuItemRow key={item.id} item={item} />
            ))}
          </Flex>
        </Flex>
      ))}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  photo: {
    width: space(7),
    height: space(7),
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  itemBody: {
    flexShrink: 1,
    minWidth: 0,
  },
  price: {
    flexShrink: 0,
  },
}));
