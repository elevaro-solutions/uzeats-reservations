import {
  restaurantProfileChangeSchema,
  type RestaurantProfileChange,
} from '@reservations/shared';

type RestaurantProfileSource = {
  description?: string | null;
  address?: { neighborhood?: string | null } | null;
  categoryIds?: string[] | null;
  landmarkIds?: string[] | null;
  diningStyles?: string[] | null;
  discoveryOccasions?: string[] | null;
  meals?: string[] | null;
  dietaryTags?: string[] | null;
  amenities?: string[] | null;
  wheelchairAccessible?: boolean | null;
  faq?: Array<{ question: string; answer: string }> | null;
  featuredIn?: Array<{
    title: string;
    description?: string | null;
    url?: string | null;
    logoUrl?: string | null;
  }> | null;
  termsAndConditions?: string | null;
  photos?: string[] | null;
  logoUrl?: string | null;
};

export function restaurantProfileSnapshot(restaurant: RestaurantProfileSource): RestaurantProfileChange {
  return restaurantProfileChangeSchema.parse({
    description: restaurant.description ?? '',
    neighborhood: restaurant.address?.neighborhood ?? '',
    categoryIds: restaurant.categoryIds ?? [],
    landmarkIds: restaurant.landmarkIds ?? [],
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
      description: item.description ?? undefined,
      url: item.url ?? undefined,
      logoUrl: item.logoUrl ?? undefined,
    })),
    termsAndConditions: restaurant.termsAndConditions ?? '',
    photos: restaurant.photos ?? [],
    logoUrl: restaurant.logoUrl ?? null,
  });
}

export function profileChangeToDbSet(profile: RestaurantProfileChange) {
  return {
    description: profile.description ?? '',
    categoryIds: profile.categoryIds,
    landmarkIds: profile.landmarkIds,
    diningStyles: profile.diningStyles,
    discoveryOccasions: profile.discoveryOccasions,
    meals: profile.meals,
    dietaryTags: profile.dietaryTags,
    amenities: profile.amenities,
    wheelchairAccessible: profile.wheelchairAccessible,
    faq: profile.faq,
    featuredIn: profile.featuredIn,
    termsAndConditions: profile.termsAndConditions ?? '',
    photos: profile.photos,
    logoUrl: profile.logoUrl ?? null,
    'address.neighborhood': profile.neighborhood ?? '',
  };
}

export function profileChangesEqual(a: RestaurantProfileChange, b: RestaurantProfileChange) {
  return JSON.stringify(normalizeProfileChange(a)) === JSON.stringify(normalizeProfileChange(b));
}

function normalizeProfileChange(profile: RestaurantProfileChange) {
  return {
    description: profile.description?.trim() ?? '',
    neighborhood: profile.neighborhood?.trim() ?? '',
    categoryIds: profile.categoryIds,
    landmarkIds: profile.landmarkIds,
    diningStyles: profile.diningStyles,
    discoveryOccasions: profile.discoveryOccasions,
    meals: profile.meals,
    dietaryTags: profile.dietaryTags,
    amenities: profile.amenities,
    wheelchairAccessible: profile.wheelchairAccessible,
    faq: profile.faq.map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim(),
    })),
    featuredIn: profile.featuredIn.map((item) => ({
      title: item.title.trim(),
      description: item.description?.trim() ?? '',
      url: item.url ?? '',
      logoUrl: item.logoUrl ?? '',
    })),
    termsAndConditions: profile.termsAndConditions?.trim() ?? '',
    photos: profile.photos,
    logoUrl: profile.logoUrl ?? null,
  };
}
