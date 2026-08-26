export type RestaurantAddress = {
  line1?: string | null;
  line2?: string | null;
  city: string;
  state: string;
  zip?: string | null;
  neighborhood?: string | null;
};

export type RestaurantShift = {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  active: boolean;
};

export type RestaurantListItem = {
  id: string;
  name: string;
  slug?: string | null;
  cuisine: string;
  priceRange: number;
  photos: string[];
  averageRating: number;
  reviewCount: number;
  featured?: boolean;
  isFavorite?: boolean;
  address: RestaurantAddress;
  shifts?: RestaurantShift[] | null;
};

export type SearchRestaurantsResult = {
  items: RestaurantListItem[];
  total: number;
  page: number;
  limit: number;
};

export type DiscoveryIndexEntry = {
  slug: string;
  label: string;
  count: number;
  city?: string | null;
  state?: string | null;
  neighborhood?: string | null;
};

export type DiscoveryIndexData = {
  cities: DiscoveryIndexEntry[];
  neighborhoods: DiscoveryIndexEntry[];
  cuisines: DiscoveryIndexEntry[];
  occasions: DiscoveryIndexEntry[];
};
