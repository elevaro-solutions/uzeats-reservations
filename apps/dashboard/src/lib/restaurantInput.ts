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
  logoUrl?: string | null;
  depositRequired: boolean;
  depositAmountCents: number;
  loyaltyEnabled: boolean;
  loyaltyPointsPerVisit: number;
  loyaltyMinRedeemPoints: number;
  photos: string[];
  categoryIds?: string[];
  landmarkIds?: string[];
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
  categoryIds?: string[];
  landmarkIds?: string[];
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
  logoUrl?: string | null,
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
    logoUrl: logoUrl !== undefined ? logoUrl ?? null : base.logoUrl ?? null,
    depositRequired: base.depositRequired,
    depositAmountCents: base.depositAmountCents,
    loyaltyEnabled: base.loyaltyEnabled,
    loyaltyPointsPerVisit: base.loyaltyPointsPerVisit,
    loyaltyMinRedeemPoints: base.loyaltyMinRedeemPoints,
    photos: photos ?? base.photos,
    neighborhood: profile?.neighborhood ?? base.address.neighborhood ?? undefined,
    categoryIds: profile?.categoryIds ?? base.categoryIds ?? [],
    landmarkIds: profile?.landmarkIds ?? base.landmarkIds ?? [],
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

export type RestaurantProfileChangeValues = {
  description?: string | null;
  neighborhood?: string | null;
  categoryIds?: string[];
  landmarkIds?: string[];
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
  photos?: string[] | null;
  logoUrl?: string | null;
};

export function profileChangeFromForm(
  values: RestaurantProfileFormValues,
  photos: string[],
  logoUrl?: string | null,
) {
  return {
    description: values.description?.trim() || undefined,
    neighborhood: values.neighborhood?.trim() || undefined,
    categoryIds: values.categoryIds ?? [],
    landmarkIds: values.landmarkIds ?? [],
    diningStyles: values.diningStyles ?? [],
    discoveryOccasions: values.discoveryOccasions ?? [],
    meals: values.meals ?? [],
    dietaryTags: values.dietaryTags ?? [],
    amenities: values.amenities ?? [],
    wheelchairAccessible: values.wheelchairAccessible ?? false,
    faq: (values.faq ?? [])
      .filter((item) => item.question?.trim() && item.answer?.trim())
      .map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      })),
    featuredIn: (values.featuredIn ?? [])
      .filter((item) => item.title?.trim())
      .map((item) => ({
        title: item.title.trim(),
        description: item.description?.trim() || undefined,
        url: item.url?.trim() || undefined,
        logoUrl: item.logoUrl?.trim() || undefined,
      })),
    termsAndConditions: values.termsAndConditions?.trim() || undefined,
    photos,
    logoUrl: logoUrl ?? null,
  };
}

export function profileValuesFromChange(profile: RestaurantProfileChangeValues): RestaurantProfileFormValues {
  return {
    description: profile.description ?? '',
    neighborhood: profile.neighborhood ?? '',
    categoryIds: profile.categoryIds ?? [],
    landmarkIds: profile.landmarkIds ?? [],
    diningStyles: profile.diningStyles ?? [],
    discoveryOccasions: profile.discoveryOccasions ?? [],
    meals: profile.meals ?? [],
    dietaryTags: profile.dietaryTags ?? [],
    amenities: profile.amenities ?? [],
    wheelchairAccessible: profile.wheelchairAccessible ?? false,
    faq: (profile.faq ?? []).map((item) => ({
      question: item.question,
      answer: item.answer,
    })),
    featuredIn: (profile.featuredIn ?? []).map((item) => ({
      title: item.title,
      description: item.description ?? '',
      url: item.url ?? '',
      logoUrl: item.logoUrl ?? '',
    })),
    termsAndConditions: profile.termsAndConditions ?? '',
  };
}

export function profileValuesFromRestaurant(restaurant: RestaurantBase): RestaurantProfileFormValues {
  return profileValuesFromChange({
    ...restaurant,
    neighborhood: restaurant.address.neighborhood,
  });
}
