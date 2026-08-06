import type { RestaurantInput } from '@reservations/shared';

type RestaurantBase = {
  name: string;
  description?: string | null;
  cuisine: string;
  priceRange: number;
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    zip: string;
    neighborhood?: string | null;
    country?: string | null;
  };
  location: { lat: number; lng: number };
  phone?: string | null;
  website?: string | null;
  menuUrl?: string | null;
  depositRequired: boolean;
  depositAmountCents: number;
  loyaltyEnabled: boolean;
  loyaltyPointsPerVisit: number;
  loyaltyMinRedeemPoints: number;
  photos: string[];
  diningStyles?: string[];
  discoveryOccasions?: string[];
  meals?: string[];
  dietaryTags?: string[];
  amenities?: string[];
  wheelchairAccessible?: boolean;
  faq?: Array<{ question: string; answer: string }>;
  featuredIn?: Array<{
    title: string;
    description?: string | null;
    url?: string | null;
    logoUrl?: string | null;
  }>;
  termsAndConditions?: string | null;
};

export type RestaurantProfileFormValues = {
  description?: string;
  neighborhood?: string;
  diningStyles?: string[];
  discoveryOccasions?: string[];
  meals?: string[];
  dietaryTags?: string[];
  amenities?: string[];
  wheelchairAccessible?: boolean;
  faq?: Array<{ question: string; answer: string }>;
  featuredIn?: Array<{
    title: string;
    description?: string;
    url?: string;
    logoUrl?: string;
  }>;
  termsAndConditions?: string;
};

export function buildRestaurantInput(
  base: RestaurantBase,
  profile?: RestaurantProfileFormValues,
  photos?: string[],
): RestaurantInput {
  return {
    name: base.name,
    description: profile?.description ?? base.description ?? undefined,
    cuisine: base.cuisine,
    priceRange: base.priceRange as RestaurantInput['priceRange'],
    address: {
      line1: base.address.line1,
      line2: base.address.line2 ?? undefined,
      city: base.address.city,
      state: base.address.state,
      zip: base.address.zip,
      country: base.address.country ?? 'US',
    },
    location: base.location,
    phone: base.phone ?? undefined,
    website: base.website ?? undefined,
    menuUrl: base.menuUrl ?? undefined,
    depositRequired: base.depositRequired,
    depositAmountCents: base.depositAmountCents,
    loyaltyEnabled: base.loyaltyEnabled,
    loyaltyPointsPerVisit: base.loyaltyPointsPerVisit,
    loyaltyMinRedeemPoints: base.loyaltyMinRedeemPoints,
    photos: photos ?? base.photos,
    neighborhood: profile?.neighborhood ?? base.address.neighborhood ?? undefined,
    diningStyles: (profile?.diningStyles ?? base.diningStyles ?? []) as RestaurantInput['diningStyles'],
    discoveryOccasions: (profile?.discoveryOccasions ??
      base.discoveryOccasions ??
      []) as RestaurantInput['discoveryOccasions'],
    meals: (profile?.meals ?? base.meals ?? []) as RestaurantInput['meals'],
    dietaryTags: (profile?.dietaryTags ?? base.dietaryTags ?? []) as RestaurantInput['dietaryTags'],
    amenities: (profile?.amenities ?? base.amenities ?? []) as RestaurantInput['amenities'],
    wheelchairAccessible: profile?.wheelchairAccessible ?? base.wheelchairAccessible ?? false,
    faq: (profile?.faq ?? base.faq ?? []).map((item) => ({
      question: item.question,
      answer: item.answer,
    })),
    featuredIn: (profile?.featuredIn ?? base.featuredIn ?? []).map((item) => ({
      title: item.title,
      description: item.description ?? undefined,
      url: item.url ?? undefined,
      logoUrl: item.logoUrl ?? undefined,
    })),
    termsAndConditions: profile?.termsAndConditions ?? base.termsAndConditions ?? undefined,
  };
}

export function profileValuesFromRestaurant(restaurant: RestaurantBase): RestaurantProfileFormValues {
  return {
    description: restaurant.description ?? '',
    neighborhood: restaurant.address.neighborhood ?? '',
    diningStyles: restaurant.diningStyles ?? [],
    discoveryOccasions: restaurant.discoveryOccasions ?? [],
    meals: restaurant.meals ?? [],
    dietaryTags: restaurant.dietaryTags ?? [],
    amenities: restaurant.amenities ?? [],
    wheelchairAccessible: restaurant.wheelchairAccessible ?? false,
    faq: (restaurant.faq ?? []).map((item) => ({
      question: item.question,
      answer: item.answer,
    })),
    featuredIn: (restaurant.featuredIn ?? []).map((item) => ({
      title: item.title,
      description: item.description ?? '',
      url: item.url ?? '',
      logoUrl: item.logoUrl ?? '',
    })),
    termsAndConditions: restaurant.termsAndConditions ?? '',
  };
}
