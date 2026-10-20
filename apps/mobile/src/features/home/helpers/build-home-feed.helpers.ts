import type { RestaurantListItem } from "@/features/discovery";
import { chunkItems } from "@/lib/use-grid-columns";

export type HomeFeedItem =
  | {
      type: "section";
      id: string;
      title: string;
      seeAllKey: "popular" | "topRated";
    }
  | { type: "error"; id: string; message: string }
  | { type: "empty"; id: string }
  | { type: "skeleton"; id: string }
  | { type: "row"; id: string; restaurants: RestaurantListItem[] };

export type HomeFeedSectionInput = {
  key: "popular" | "topRated";
  title: string;
  loading: boolean;
  error?: string;
  items: RestaurantListItem[];
  limit: number;
};

export function buildHomeFeedItems(
  sections: HomeFeedSectionInput[],
  columns: number,
): HomeFeedItem[] {
  const out: HomeFeedItem[] = [];

  for (const section of sections) {
    out.push({
      type: "section",
      id: `${section.key}-header`,
      title: section.title,
      seeAllKey: section.key,
    });

    if (section.error) {
      out.push({
        type: "error",
        id: `${section.key}-error`,
        message: section.error,
      });
    }

    if (section.loading && section.items.length === 0) {
      out.push({ type: "skeleton", id: `${section.key}-skeleton` });
      continue;
    }

    const visible = section.items.slice(0, section.limit);
    if (visible.length === 0) {
      out.push({ type: "empty", id: `${section.key}-empty` });
      continue;
    }

    chunkItems(visible, columns).forEach((restaurants, index) => {
      out.push({
        type: "row",
        id: `${section.key}-row-${index}`,
        restaurants,
      });
    });
  }

  return out;
}
