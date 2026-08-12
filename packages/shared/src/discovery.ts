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
        answer: `Open the ${cuisine} restaurants page, set your city or enable Near Me, then choose a date and party size. Pick an open time slot on the restaurant page — confirmation is instant and free for diners. You can add special requests, dietary notes, or a promo code before you confirm.`,
      },
      {
        question: `Can I filter ${lower} restaurants by dietary needs?`,
        answer: `Yes. Use dietary filters for Halal, Kosher, Vegetarian, Vegan, Gluten-Free, and Allergy-Aware listings, then refine by price, rating, and amenities such as outdoor seating or private dining. Always mention allergies in special requests so the restaurant can prepare.`,
      },
      {
        question: `Are ${lower} restaurant reservations free on Tablevera?`,
        answer: `Reservations are free for diners. Some restaurants require a refundable deposit per guest that is applied to your bill; deposit details appear on the restaurant page before you book.`,
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
        answer: `Venues tagged for ${lower} typically match the atmosphere, seating style, and amenities guests expect for that occasion — for example romantic dining styles for date night, or private dining and larger tables for group events. Combine occasion filters with cuisine and price to narrow the list.`,
      },
      {
        question: 'Can I book for a large party?',
        answer:
          'Yes. Set your party size before searching so you only see restaurants with open tables for that headcount. For bigger groups, filter by Group Dining or Private Event, then review the restaurant’s deposit and cancellation terms before confirming.',
      },
      {
        question: `How far in advance should I reserve for ${lower}?`,
        answer: `Popular ${lower} times fill quickly on weekends. Book as soon as your date is set, or join the waitlist on the restaurant page if your preferred slot is taken. You can usually modify or cancel from your Tablevera reservations according to the venue’s policy.`,
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
        question: `How do I find restaurants in ${city}, ${state}?`,
        answer: `This page lists bookable restaurants in ${city}. Use cuisine, price, occasion, and dietary filters, or switch to map view to browse by neighborhood. Choose a date and party size to see live availability before you reserve.`,
      },
      {
        question: `Can I find restaurants near me in ${city}?`,
        answer: `Yes. Tap Near Me to center results on your location, or search a neighborhood within ${city}. Results prioritize nearby venues with open tables for your selected date and party size.`,
      },
      {
        question: `Is booking a table in ${city} free for diners?`,
        answer: `Yes — Tablevera is free for diners. A restaurant may ask for a per-guest deposit that is applied to your check; any deposit amount is shown before you confirm the reservation.`,
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
        question: `What restaurants can I book in ${neighborhood}?`,
        answer: `This page shows Tablevera partners in ${neighborhood}, ${city}. Sort and filter by cuisine, price, rating, occasion, and amenities, then open a restaurant to pick a live time slot for your party size.`,
      },
      {
        question: `How do I use Near Me in ${neighborhood}?`,
        answer: `Tap Near Me to use your device location, or keep the search centered on ${neighborhood}. Then set date, time preferences, and party size so the list and map only show tables you can actually reserve.`,
      },
      {
        question: `Can I reserve same-day in ${neighborhood}?`,
        answer: `Often yes. Select today’s date and your party size to see open slots across ${neighborhood}. If a preferred time is full, try nearby times or join that restaurant’s waitlist when available.`,
      },
    ],
  };
}
