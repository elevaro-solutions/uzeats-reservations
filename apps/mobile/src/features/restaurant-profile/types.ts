import type { RestaurantAddress, RestaurantShift } from "@/features/discovery";

export type RestaurantLocation = {
  lat: number;
  lng: number;
};

export type RestaurantFaqItem = {
  question: string;
  answer: string;
};

export type RestaurantMenuItem = {
  id: string;
  name: string;
  description?: string | null;
  priceCents?: number | null;
  dietary?: string[] | null;
  photoUrl?: string | null;
};

export type RestaurantMenuSection = {
  id: string;
  name: string;
  items: RestaurantMenuItem[];
};

export type RestaurantDetail = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  cuisine: string;
  priceRange: number;
  photos: string[];
  phone?: string | null;
  website?: string | null;
  menuUrl?: string | null;
  depositRequired?: boolean;
  depositAmountCents?: number | null;
  averageRating: number;
  reviewCount: number;
  featured?: boolean;
  isFavorite?: boolean;
  wheelchairAccessible?: boolean;
  amenities?: string[];
  meals?: string[];
  diningStyles?: string[];
  dietaryTags?: string[];
  termsAndConditions?: string | null;
  location?: RestaurantLocation | null;
  faq?: RestaurantFaqItem[] | null;
  address: RestaurantAddress & {
    line1: string;
  };
  shifts?: RestaurantShift[] | null;
  menu?: {
    sections?: RestaurantMenuSection[] | null;
  } | null;
};

export type RestaurantQueryData = {
  restaurant: RestaurantDetail | null;
};

export type RestaurantReviewDiner = {
  firstName?: string | null;
  lastName?: string | null;
};

export type RestaurantReview = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  ownerReply?: string | null;
  diner?: RestaurantReviewDiner | null;
};

export type RestaurantReviewsQueryData = {
  restaurantReviews: {
    total: number;
    items: RestaurantReview[];
  };
};

export type ProfileSectionTab = "details" | "menu" | "reviews" | "photos";
