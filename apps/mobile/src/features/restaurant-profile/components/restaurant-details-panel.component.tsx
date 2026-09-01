import { StyleSheet } from "react-native-unistyles";

import { Flex } from "@/components";

import { resolveRestaurantTerms } from "../helpers/restaurant-terms.helpers";
import type { RestaurantDetail } from "../types";

import { RestaurantAbout } from "./restaurant-about.component";
import { RestaurantDetailSections } from "./restaurant-detail-sections.component";
import { RestaurantFaq } from "./restaurant-faq.component";
import { RestaurantTerms } from "./restaurant-terms.component";

export type RestaurantDetailsPanelProps = {
  restaurant: RestaurantDetail;
};

export function RestaurantDetailsPanel({
  restaurant,
}: RestaurantDetailsPanelProps) {
  const cmsFaq = (restaurant.faq ?? []).filter(
    (item) => item.question.trim() && item.answer.trim(),
  );
  const terms = resolveRestaurantTerms({
    name: restaurant.name,
    depositRequired: restaurant.depositRequired,
    depositAmountCents: restaurant.depositAmountCents ?? undefined,
    termsAndConditions: restaurant.termsAndConditions,
  });

  return (
    <Flex gap={3.5} style={styles.panel}>
      {restaurant.description ? (
        <RestaurantAbout description={restaurant.description} />
      ) : null}

      <RestaurantDetailSections restaurant={restaurant} />
      <RestaurantFaq items={cmsFaq} />
      <RestaurantTerms terms={terms} />
    </Flex>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  panel: {
    paddingTop: space(0.5),
  },
}));
