import { Image } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex, Typography } from "@/components";

export type RestaurantHeroProps = {
  name: string;
  photo?: string | null;
};

export function RestaurantHero({ name, photo }: RestaurantHeroProps) {
  if (photo) {
    return (
      <Image
        source={{ uri: photo }}
        style={styles.hero}
        resizeMode="cover"
        accessibilityLabel={name}
      />
    );
  }

  return (
    <Flex
      style={styles.heroPlaceholder}
      justifyContent="center"
      alignItems="center"
    >
      <Typography color="muted">No photo</Typography>
    </Flex>
  );
}

const styles = StyleSheet.create(({ colors }) => ({
  hero: {
    width: "100%",
    height: 240,
    backgroundColor: colors.surface,
  },
  heroPlaceholder: {
    width: "100%",
    height: 240,
    backgroundColor: colors.surface,
  },
}));
