import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex, InlineAlert, RestaurantCardSkeleton, Typography } from "@/components";
import { RestaurantCard, type RestaurantListItem } from "@/features/discovery";

import { HOME_LIST_LIMIT } from "../home.constants";
import { SectionHeader } from "./section-header.component";

export type HomeRestaurantSectionProps = {
  title: string;
  loading: boolean;
  error?: string;
  items: RestaurantListItem[];
  onSeeAll: () => void;
};

export function HomeRestaurantSection({
  title,
  loading,
  error,
  items,
  onSeeAll,
}: HomeRestaurantSectionProps) {
  const visible = items.slice(0, HOME_LIST_LIMIT);

  return (
    <Flex gap={2.5}>
      <SectionHeader title={title} onActionPress={onSeeAll} />
      {error ? (
        <View style={styles.padX}>
          <InlineAlert tone="error" title="Couldn’t load" message={error} />
        </View>
      ) : null}
      {loading && items.length === 0 ? (
        <Flex gap={2.5} style={styles.padX}>
          {[1, 2].map((i) => (
            <RestaurantCardSkeleton key={i} />
          ))}
        </Flex>
      ) : items.length === 0 ? (
        <View style={styles.padX}>
          <Typography size="text-sm" color="secondary">
            No restaurants found for this area yet.
          </Typography>
        </View>
      ) : (
        <Flex gap={2.5} style={styles.padX}>
          {visible.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              variant="list"
            />
          ))}
        </Flex>
      )}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  padX: {
    paddingHorizontal: space(2),
  },
}));
