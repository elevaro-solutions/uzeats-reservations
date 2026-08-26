import { Image, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native-unistyles";

import { ClockIcon, HeartIcon, StarIcon } from "@/assets";
import { Flex, Typography } from "@/components";

import { formatCardAddress } from "../helpers/format-location.helpers";
import { formatShortHours } from "../helpers/format-short-hours.helpers";
import { useToggleFavorite } from "../hooks/use-toggle-favorite.hook";
import type { RestaurantListItem } from "../types";

export type RestaurantCardProps = {
  restaurant: RestaurantListItem;
  variant?: "list" | "carousel";
};

export function RestaurantCard({
  restaurant,
  variant = "list",
}: RestaurantCardProps) {
  styles.useVariants({ variant });
  const router = useRouter();
  const photo = restaurant.photos?.[0];
  const address = formatCardAddress(restaurant.address);
  const hours = formatShortHours(restaurant.shifts);
  const cuisine = restaurant.cuisine?.trim();
  const { isFavorite, toggleFavorite } = useToggleFavorite(
    restaurant.id,
    restaurant.isFavorite ?? false,
  );

  const ratingLabel =
    restaurant.averageRating > 0
      ? restaurant.averageRating.toFixed(1)
      : "New";

  function openProfile() {
    router.push({
      pathname: "/restaurant/[id]",
      params: { id: restaurant.id },
    });
  }

  return (
    <View style={styles.shadow}>
      <Pressable
        onPress={openProfile}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={restaurant.name}
      >
        <View style={styles.imageWrap}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={styles.image}
              resizeMode="cover"
              accessibilityLabel={restaurant.name}
            />
          ) : (
            <Flex
              style={styles.imagePlaceholder}
              justifyContent="center"
              alignItems="center"
            >
              <Typography size="text-sm" color="muted">
                No photo
              </Typography>
            </Flex>
          )}

          <Pressable
            onPress={toggleFavorite}
            hitSlop={8}
            style={styles.favoriteBtn}
            accessibilityRole="button"
            accessibilityLabel={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            accessibilityState={{ selected: isFavorite }}
          >
            <HeartIcon
              filled={isFavorite}
              size={20}
              color={isFavorite ? styles.heartFilled.color : styles.heart.color}
            />
          </Pressable>

          <View style={styles.ratingBadge}>
            <StarIcon filled size={12} color={styles.star.color} />
            <Typography size="text-xs" weight="semibold" style={styles.ratingText}>
              {ratingLabel}
            </Typography>
            {restaurant.reviewCount > 0 ? (
              <Typography size="text-xs" style={styles.ratingCount}>
                ({restaurant.reviewCount})
              </Typography>
            ) : null}
          </View>
        </View>

        <Flex gap={1} style={styles.body}>
          <Typography weight="semibold" size="text-lg" numberOfLines={1}>
            {restaurant.name}
          </Typography>

          {address ? (
            <Typography
              size="text-sm"
              color="secondary"
              numberOfLines={1}
            >
              {address}
            </Typography>
          ) : null}

          <Flex direction="row" alignItems="center" gap={1} style={styles.metaRow}>
            {hours ? (
              <View style={styles.metaChip}>
                <ClockIcon size={14} color={styles.metaIcon.color} />
                <Typography size="text-xs" weight="medium" color="secondary">
                  {hours}
                </Typography>
              </View>
            ) : null}
            {cuisine ? (
              <View style={styles.metaChip}>
                <Typography size="text-xs" weight="medium" color="secondary">
                  {cuisine}
                </Typography>
              </View>
            ) : null}
          </Flex>
        </Flex>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors, shadows }) => ({
  shadow: {
    ...shadows.card,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    variants: {
      variant: {
        list: {
          width: "100%",
        },
        carousel: {
          width: 272,
        },
      },
    },
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.96,
  },
  imageWrap: {
    position: "relative",
    width: "100%",
    variants: {
      variant: {
        list: { height: 188 },
        carousel: { height: 156 },
      },
    },
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.surface,
  },
  favoriteBtn: {
    position: "absolute",
    top: space(1.25),
    right: space(1.25),
    width: space(5),
    height: space(5),
    borderRadius: radius.full,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  heart: {
    color: colors.white,
  },
  heartFilled: {
    color: colors.red9,
  },
  ratingBadge: {
    position: "absolute",
    right: space(1.25),
    bottom: space(1.25),
    flexDirection: "row",
    alignItems: "center",
    gap: space(0.5),
    paddingVertical: space(0.5),
    paddingHorizontal: space(1),
    borderRadius: radius.full,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  ratingText: {
    color: colors.white,
  },
  ratingCount: {
    color: colors.white,
  },
  star: {
    color: colors.accent,
  },
  body: {
    paddingHorizontal: space(1.5),
    paddingTop: space(1.25),
    paddingBottom: space(1.5),
  },
  metaRow: {
    flexWrap: "wrap",
    marginTop: space(0.25),
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(0.5),
    paddingVertical: space(0.5),
    paddingHorizontal: space(1),
    borderRadius: radius.full,
    backgroundColor: colors.slate2,
  },
  metaIcon: {
    color: colors.textMuted,
  },
}));
