import type { RestaurantAddress, RestaurantShift } from "@/features/discovery";

export type RestaurantDetail = {
  id: string;
  name: string;
  description?: string | null;
  cuisine: string;
  priceRange: number;
  photos: string[];
  averageRating: number;
  reviewCount: number;
  featured?: boolean;
  wheelchairAccessible?: boolean;
  amenities?: string[];
  address: RestaurantAddress & {
    line1: string;
  };
  shifts?: RestaurantShift[] | null;
};

export type RestaurantQueryData = {
  restaurant: RestaurantDetail | null;
};
