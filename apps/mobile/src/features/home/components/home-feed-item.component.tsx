import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex, InlineAlert, Typography } from "@/components";
import { RestaurantCardSkeleton } from "@/components/skeleton";
import {
  RestaurantCard,
  SectionHeader,
  type RestaurantListItem,
} from "@/features/discovery";
import type { GridColumns } from "@/lib/use-grid-columns";

import type { HomeFeedItem } from "../helpers/build-home-feed.helpers";

export type HomeFeedItemViewProps = {
  item: HomeFeedItem;
  columns: GridColumns;
  onSeeAll: (key: "popular" | "topRated") => void;
};

export function HomeFeedItemView({
  item,
  columns,
  onSeeAll,
}: HomeFeedItemViewProps) {
  if (item.type === "section") {
    return (
      <View style={styles.section}>
        <SectionHeader
          title={item.title}
          onActionPress={() => onSeeAll(item.seeAllKey)}
        />
      </View>
    );
  }

  if (item.type === "error") {
    return (
      <View style={styles.padX}>
        <InlineAlert tone="error" title="Couldn’t load" message={item.message} />
      </View>
    );
  }

  if (item.type === "empty") {
    return (
      <View style={styles.padX}>
        <Typography size="text-sm" color="secondary">
          No restaurants found for this area yet.
        </Typography>
      </View>
    );
  }

  if (item.type === "skeleton") {
    return <RestaurantGridSkeleton columns={columns} />;
  }

  return <HomeRestaurantRow restaurants={item.restaurants} columns={columns} />;
}

function HomeRestaurantRow({
  restaurants,
  columns,
}: {
  restaurants: RestaurantListItem[];
  columns: GridColumns;
}) {
  const spacers = Math.max(0, columns - restaurants.length);

  return (
    <Flex direction="row" gap={2.5} style={styles.row}>
      {restaurants.map((restaurant) => (
        <View key={restaurant.id} style={styles.cell}>
          <RestaurantCard restaurant={restaurant} variant="list" />
        </View>
      ))}
      {Array.from({ length: spacers }, (_, index) => (
        <View key={`spacer-${index}`} style={styles.cell} />
      ))}
    </Flex>
  );
}

function RestaurantGridSkeleton({ columns }: { columns: GridColumns }) {
  return (
    <Flex gap={2.5} style={styles.padX}>
      {[0, 1].map((row) => (
        <Flex key={row} direction="row" gap={2.5}>
          {Array.from({ length: columns }, (_, index) => (
            <View key={index} style={styles.cell}>
              <RestaurantCardSkeleton />
            </View>
          ))}
        </Flex>
      ))}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  padX: {
    paddingHorizontal: space(2),
  },
  row: {
    paddingHorizontal: space(2),
    marginBottom: space(2.5),
  },
  cell: {
    flex: 1,
    minWidth: 0,
  },
  section: {
    marginTop: space(4),
    marginBottom: space(2.5),
  },
}));
