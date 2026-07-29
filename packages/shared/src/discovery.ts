/** Discovery filter values, SEO slugs, and landing-page metadata helpers. */

export const DISCOVERY_OCCASIONS = [
  'Date Night',
  'Birthday',
  'Anniversary',
  'Business Meal',
  'Family Dinner',
  'Group Dining',
  'Special Occasion',
  'Private Event',
] as const;

export const DINING_STYLES = [
  'Fine Dining',
  'Casual',
  'Family-Friendly',
  'Romantic',
  'Trendy',
  'Rooftop',
  'Waterfront',
  'Outdoor Dining',
  'Sports Bar',
  'Live Music',
  'Late Night',
] as const;

export const MEALS = [
  'Breakfast',
  'Brunch',
  'Lunch',
  'Dinner',
  'Happy Hour',
  'Dessert',
] as const;

export const DIETARY_TAGS = [
  'Halal',
  'Kosher',
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Allergy-Aware',
] as const;

export const AMENITIES = [
  'Private Dining',
  'Outdoor Seating',
  'Bar Seating',
  'Parking',
  'Wheelchair Accessible',
  "Kids' Menu",
  'Live Entertainment',
] as const;

export type DiscoveryOccasion = (typeof DISCOVERY_OCCASIONS)[number];
export type DiningStyle = (typeof DINING_STYLES)[number];
export type Meal = (typeof MEALS)[number];
export type DietaryTag = (typeof DIETARY_TAGS)[number];
export type Amenity = (typeof AMENITIES)[number];

/** URL-safe slug from a display label. */
export function discoverySlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function citySlug(city: string, state: string): string {
  return `${discoverySlug(city)}-${state.toLowerCase()}`;
}

export function neighborhoodSlug(neighborhood: string, city: string, state: string): string {
  return `${discoverySlug(neighborhood)}-${discoverySlug(city)}-${state.toLowerCase()}`;
}

const CUISINE_SLUG_MAP: Record<string, string> = {
  'Uzbek/Central Asian': 'uzbek-central-asian',
  Uzbek: 'uzbek-central-asian',
};

export function cuisineSlug(cuisine: string): string {
  return CUISINE_SLUG_MAP[cuisine] ?? discoverySlug(cuisine);
}

export function occasionSlug(occasion: DiscoveryOccasion): string {
  return discoverySlug(occasion);
}

export function slugToCuisine(slug: string, cuisines: readonly string[]): string | undefined {
  for (const cuisine of cuisines) {
    if (cuisineSlug(cuisine) === slug) return cuisine;
  }
  return undefined;
}

export function slugToOccasion(slug: string): DiscoveryOccasion | undefined {
  return DISCOVERY_OCCASIONS.find((o) => discoverySlug(o) === slug);
}

export interface DiscoveryLandingMeta {
  title: string;
  description: string;
  heading: string;
  intro: string;
  faq: Array<{ question: string; answer: string }>;
}

export function cuisineLandingMeta(cuisine: string): DiscoveryLandingMeta {
  const lower = cuisine.toLowerCase();
  return {
    title: `Best ${cuisine} Restaurants — Book a Table | Tablevera`,
    description: `Discover top-rated ${lower} restaurants near you. Compare menus, read reviews, and reserve tables instantly on Tablevera.`,
    heading: `${cuisine} Restaurants`,
    intro: `From neighborhood favorites to chef-driven destinations, explore ${lower} dining with real-time table availability. Filter by price, occasion, and amenities to find your perfect meal.`,
    faq: [
      {
        question: `How do I book a ${lower} restaurant on Tablevera?`,
        answer: `Search ${lower} restaurants by location, pick your date and party size, then choose an available time slot. Confirmation is instant and free for diners.`,
      },
      {
        question: `Can I filter ${lower} restaurants by dietary needs?`,
        answer: 'Yes — use dietary filters for halal, kosher, vegetarian, vegan, gluten-free, and allergy-aware options.',
      },
    ],
  };
}

export function occasionLandingMeta(occasion: DiscoveryOccasion): DiscoveryLandingMeta {
  const lower = occasion.toLowerCase();
  return {
    title: `${occasion} Restaurants — Reserve Your Table | Tablevera`,
    description: `Find restaurants perfect for ${lower}. Browse by neighborhood, cuisine, and price — with live availability for your date and party size.`,
    heading: `Restaurants for ${occasion}`,
    intro: `Planning ${lower}? Tablevera surfaces venues matched to your occasion — from intimate date-night spots to group-friendly private dining rooms.`,
    faq: [
      {
        question: `What makes a restaurant good for ${lower}?`,
        answer: 'We tag venues by dining style, amenities, and occasion so you can quickly find atmospheres that fit your celebration or meeting.',
      },
      {
        question: 'Can I book for a large party?',
        answer: 'Filter by group dining or private event, then check real-time availability for your headcount before you reserve.',
      },
    ],
  };
}

export function cityLandingMeta(city: string, state: string): DiscoveryLandingMeta {
  return {
    title: `Restaurants in ${city}, ${state} — Book Tables | Tablevera`,
    description: `Explore restaurants in ${city}, ${state}. Search by cuisine, neighborhood, price, and occasion with live table availability.`,
    heading: `Restaurants in ${city}, ${state}`,
    intro: `Whether you are planning a weeknight dinner or a special celebration, browse ${city}'s dining scene with map search, filters, and instant reservations.`,
    faq: [
      {
        question: `How many restaurants are in ${city} on Tablevera?`,
        answer: `Our directory grows weekly — search ${city} to see current listings with ratings, cuisines, and open reservation times.`,
      },
      {
        question: `Can I find restaurants near me in ${city}?`,
        answer: 'Yes — enable location or pick a neighborhood to see nearby venues sorted by distance with available tables.',
      },
    ],
  };
}

export function neighborhoodLandingMeta(
  neighborhood: string,
  city: string,
  state: string,
): DiscoveryLandingMeta {
  return {
    title: `${neighborhood} Restaurants, ${city} ${state} | Tablevera`,
    description: `Book tables in ${neighborhood}, ${city}. Filter by cuisine, price, and occasion with real-time availability.`,
    heading: `${neighborhood} Restaurants`,
    intro: `Discover the best places to eat in ${neighborhood} — walkable favorites and hidden gems with live reservation slots.`,
    faq: [
      {
        question: `What cuisines are popular in ${neighborhood}?`,
        answer: `Browse our ${neighborhood} listings to see top cuisines, ratings, and price ranges updated in real time.`,
      },
      {
        question: `How do I use Near Me in ${neighborhood}?`,
        answer: 'Tap Near Me or search the neighborhood to center the map and list on your area, then filter by meal time and party size.',
      },
    ],
  };
}
