import { ScrollView } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Link } from "expo-router";

import { SearchIcon, StarIcon } from "@/assets";
import {
  Button,
  Chip,
  Flex,
  InlineAlert,
  Input,
  Typography,
} from "@/components";
import { MOCK_RESTAURANTS } from "@/data/mock-restaurants";
import { useAppStore } from "@/store";

export function HomeFeature() {
  const lastSearchCity = useAppStore((s) => s.lastSearchCity);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Flex gap={2}>
        <Typography size="display-xs" weight="bold">
          Tablevera
        </Typography>
        <Typography color="secondary">
          Find a table in {lastSearchCity}
        </Typography>

        <Input
          label="Search"
          placeholder="Cuisine, neighborhood, restaurant…"
          prefix={<SearchIcon size={18} color={styles.searchIcon.color} />}
        />

        <Flex gap={1} direction="row" flexWrap="wrap">
          <Chip selected>Tonight</Chip>
          <Chip>2 guests</Chip>
          <Chip icon={<StarIcon />}>Top rated</Chip>
        </Flex>

        <InlineAlert
          tone="info"
          title="Browse"
          message="Mock restaurants below. Live search will use the Tablevera GraphQL API."
        />

        <Flex gap={1.5}>
          {MOCK_RESTAURANTS.map((restaurant) => (
            <Flex key={restaurant.id} gap={0.5} style={styles.card}>
              <Typography weight="semibold" size="text-lg">
                {restaurant.name}
              </Typography>
              <Typography size="text-sm" color="secondary">
                {restaurant.cuisine} · {restaurant.neighborhood} ·{" "}
                {restaurant.priceRange}
              </Typography>
              <Typography size="text-sm" color="accent">
                ★ {restaurant.rating.toFixed(1)} · {restaurant.partyHint}
              </Typography>
            </Flex>
          ))}
        </Flex>

        <Link href="/demo" asChild>
          <Button variant="outlined" color="secondary" fullWidth>
            Open component kit demo
          </Button>
        </Link>
      </Flex>
    </ScrollView>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  content: {
    padding: space(2),
    paddingBottom: space(4),
    backgroundColor: colors.background,
  },
  searchIcon: {
    color: colors.textMuted,
  },
  card: {
    padding: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
}));
