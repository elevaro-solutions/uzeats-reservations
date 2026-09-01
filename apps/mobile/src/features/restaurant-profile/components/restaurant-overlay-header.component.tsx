import { Share, View } from "react-native";
import { useRouter } from "expo-router";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChevronLeftIcon, HeartIcon, ShareIcon } from "@/assets";
import { Flex, IconButton } from "@/components";
import { useToggleFavorite } from "@/features/discovery";

import { buildRestaurantShareUrl } from "../helpers/restaurant-links.helpers";

export type RestaurantOverlayHeaderProps = {
  restaurantId: string;
  name: string;
  slug?: string | null;
  isFavorite?: boolean;
};

export function RestaurantOverlayHeader({
  restaurantId,
  name,
  slug,
  isFavorite = false,
}: RestaurantOverlayHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { isFavorite: favorite, toggleFavorite } = useToggleFavorite(
    restaurantId,
    isFavorite,
  );

  async function onShare() {
    const url = buildRestaurantShareUrl(slug || restaurantId);
    try {
      await Share.share({
        message: `Check out ${name} on Tablevera\n${url}`,
        url,
        title: name,
      });
    } catch {
      // User dismissed share sheet
    }
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.bar, { paddingTop: insets.top + theme.space(1) }]}
    >
      <Flex
        direction="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <IconButton
          icon={<ChevronLeftIcon />}
          variant="surface"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.chrome}
        />
        <Flex direction="row" alignItems="center" gap={1}>
          <IconButton
            icon={<ShareIcon />}
            variant="surface"
            accessibilityLabel="Share restaurant"
            onPress={onShare}
            style={styles.chrome}
          />
          <IconButton
            icon={<HeartIcon filled={favorite} />}
            variant="surface"
            color={favorite ? theme.colors.error : theme.colors.textPrimary}
            accessibilityLabel={
              favorite ? "Remove from favorites" : "Add to favorites"
            }
            onPress={toggleFavorite}
            style={styles.chrome}
          />
        </Flex>
      </Flex>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: space(2),
    paddingBottom: space(1),
  },
  chrome: {
    backgroundColor: colors.background,
    opacity: 0.94,
    borderRadius: radius.full,
  },
}));
