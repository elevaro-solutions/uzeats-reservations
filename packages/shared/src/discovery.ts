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

/** City-specific intro blurbs keyed by `city|STATE` (case-insensitive city). */
const CITY_INTRO_BLURBS: Record<string, string> = {
  'new york|NY':
    'New York’s dining scene spans fine dining, neighborhood staples, and late-night favorites. Use map search and live slots to book Midtown, downtown, and borough destinations without phone tag.',
  'brooklyn|NY':
    'Brooklyn dining runs from Williamsburg tasting menus to waterfront classics. Filter by neighborhood, cuisine, and occasion, then reserve open tables the same day or weeks ahead.',
  'queens|NY':
    'Queens is one of the country’s great cuisine corridors — from Astoria to Flushing. Browse by cuisine and dietary needs, then lock in a table with real-time availability.',
  'jersey city|NJ':
    'Jersey City’s waterfront and downtown spots are an easy hop from Manhattan. Compare ratings, price, and amenities, then book with instant confirmation.',
  'miami|FL':
    'Miami dining mixes Brickell nightlife, beachside seafood, and Latin-inspired kitchens. Filter by meal, occasion, and outdoor seating, then reserve live availability.',
  'orlando|FL':
    'Orlando dining covers resort corridors and local favorites beyond the parks. Search by cuisine and party size so you only see tables that actually fit your plans.',
  'tampa|FL':
    'Tampa’s scene stretches from Ybor City to waterfront dining. Use occasion and cuisine filters to shortlist venues, then pick a live reservation slot.',
  'philadelphia|PA':
    'Philadelphia dining ranges from Center City classics to neighborhood gems. Browse by cuisine, price, and amenities — then book without the phone call.',
  'hoboken|NJ':
    'Hoboken’s walkable downtown packs date-night spots and casual favorites. Set your party size and date to see open tables, or tap Near Me when you’re already in town.',
  'newark|NJ':
    'Newark dining covers Ironbound classics and downtown destinations. Filter by cuisine and dietary needs, then reserve with live availability on Tablevera.',
};

function cityIntroKey(city: string, state: string): string {
  return `${city.trim().toLowerCase()}|${state.trim().toUpperCase()}`;
}

function bookingFaq(placeLabel: string): Array<{ question: string; answer: string }> {
  return [
    {
      question: `What if my preferred time in ${placeLabel} is full?`,
      answer: `Try nearby times on the restaurant page, switch to map view for alternatives, or join the waitlist when offered. You can also broaden cuisine or neighborhood filters while keeping your date and party size.`,
    },
    {
      question: `Do Tablevera restaurant hours in ${placeLabel} match Google or the venue website?`,
      answer: `Reservation hours on Tablevera come from each restaurant’s active booking shifts and may differ on holidays or special events. Confirm details on the restaurant page before you book.`,
    },
  ];
}

export function cuisineLandingMeta(cuisine: string): DiscoveryLandingMeta {
  const lower = cuisine.toLowerCase();
  return {
    title: `Best ${cuisine} Restaurants — Book a Table | Tablevera`,
    description: `Discover top-rated ${lower} restaurants near you. Compare menus, read reviews, and reserve tables instantly on Tablevera.`,
    heading: `${cuisine} Restaurants`,
    intro: `From neighborhood favorites to chef-driven destinations, explore ${lower} dining with real-time table availability. Filter by price, occasion, and amenities to find your perfect meal — then open a city hub for ${lower} restaurants near you.`,
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
      {
        question: `How do I find the best ${lower} restaurants near me?`,
        answer: `Tap Near Me on this page, enable the top-rated filter, or open a cuisine × city page (for example ${cuisine} restaurants in your city). Set party size and date so you only see bookable tables.`,
      },
      ...bookingFaq(`${lower} restaurants`),
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
  const place = `${city}, ${state}`;
  const blurb = CITY_INTRO_BLURBS[cityIntroKey(city, state)];
  return {
    title: `Restaurants in ${place} — Book Tables | Tablevera`,
    description: `Explore restaurants in ${place}. Search by cuisine, neighborhood, price, and occasion with live table availability on Tablevera.`,
    heading: `Restaurants in ${place}`,
    intro:
      blurb ??
      `Whether you are planning a weeknight dinner or a special celebration, browse ${city}'s dining scene with map search, filters, and instant reservations. Jump to top restaurants, cuisine hubs, or restaurants near me in ${city} when you want a tighter list.`,
    faq: [
      {
        question: `How do I find restaurants in ${place}?`,
        answer: `This page lists bookable restaurants in ${city}. Use cuisine, price, occasion, and dietary filters, or switch to map view to browse by neighborhood. Choose a date and party size to see live availability before you reserve.`,
      },
      {
        question: `Can I find restaurants near me in ${city}?`,
        answer: `Yes. Tap Near Me to center results on your location, open restaurants near me in ${place}, or search a neighborhood within ${city}. Results prioritize nearby venues with open tables for your selected date and party size.`,
      },
      {
        question: `Where are the top restaurants in ${city}?`,
        answer: `Open Top restaurants in ${city} for highly rated partners (typically 4.5+), or enable the top-rated filter on this page and refine by cuisine or neighborhood.`,
      },
      {
        question: `Is booking a table in ${city} free for diners?`,
        answer: `Yes — Tablevera is free for diners. A restaurant may ask for a per-guest deposit that is applied to your check; any deposit amount is shown before you confirm the reservation.`,
      },
      ...bookingFaq(place),
    ],
  };
}

export function neighborhoodLandingMeta(
  neighborhood: string,
  city: string,
  state: string,
): DiscoveryLandingMeta {
  const place = `${neighborhood}, ${city}`;
  return {
    title: `${neighborhood} Restaurants, ${city} ${state} | Tablevera`,
    description: `Book tables in ${neighborhood}, ${city}. Filter by cuisine, price, and occasion with real-time availability on Tablevera.`,
    heading: `${neighborhood} Restaurants`,
    intro: `Discover the best places to eat in ${neighborhood} — walkable favorites and hidden gems with live reservation slots. Pair this hub with cuisine filters or restaurants near me in ${city} when you want more options nearby.`,
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
      ...bookingFaq(place),
    ],
  };
}

export function stateSlug(stateCode: string): string {
  return stateCode.toLowerCase();
}

export function landmarkSlug(landmark: string, state: string): string {
  return `${discoverySlug(landmark)}-${state.toLowerCase()}`;
}

export function topRestaurantsLandingMeta(city?: string, state?: string): DiscoveryLandingMeta {
  if (city && state) {
    return {
      title: `Top Restaurants in ${city}, ${state} — Highly Rated | Tablevera`,
      description: `Browse top-rated restaurants in ${city}, ${state}. Compare menus, ratings, and live table availability — reserve instantly on Tablevera.`,
      heading: `Top restaurants in ${city}, ${state}`,
      intro: `Hand-picked highly rated dining in ${city}. Filter by cuisine, neighborhood, price, and occasion to book a table with confidence.`,
      faq: [
        {
          question: `How are top restaurants in ${city} ranked?`,
          answer: `This list highlights Tablevera partners in ${city} with strong guest ratings (typically 4.5+). Combine top-rated with cuisine, price, and occasion filters to match your plans.`,
        },
        {
          question: `Can I book a top-rated restaurant in ${city} tonight?`,
          answer: `Often yes. Set today’s date and your party size to see open slots at highly rated venues. If a preferred time is full, try nearby times or join the waitlist.`,
        },
        {
          question: `Is reserving a top restaurant in ${city} free?`,
          answer: `Reservations are free for diners on Tablevera. Some restaurants require a refundable deposit per guest applied to your bill — details appear before you confirm.`,
        },
      ],
    };
  }

  return {
    title: 'Top Restaurants — Highly Rated Dining | Tablevera',
    description:
      'Discover top-rated restaurants with live reservations. Filter by city, cuisine, price, and occasion — book free on Tablevera.',
    heading: 'Top restaurants',
    intro:
      'Explore highly rated Tablevera partners with real-time availability. Narrow by location, cuisine, and occasion to find your next great meal.',
    faq: [
      {
        question: 'What does top-rated mean on Tablevera?',
        answer:
          'Top restaurants are partners with strong average guest ratings (typically 4.5 stars or higher). You can still refine by city, cuisine, price, dietary needs, and amenities.',
      },
      {
        question: 'How do I find top restaurants near me?',
        answer:
          'Open Top Restaurants and tap Near Me, or browse a city or landmark page and enable the top-rated filter. Set your date and party size to see bookable tables.',
      },
      {
        question: 'Are top restaurant reservations free?',
        answer:
          'Yes for diners. A venue may collect a per-guest deposit that is applied to your check; any deposit is shown before you confirm.',
      },
    ],
  };
}

export function stateLandingMeta(stateName: string, stateCode: string): DiscoveryLandingMeta {
  return {
    title: `Restaurants in ${stateName} (${stateCode}) — Book Tables | Tablevera`,
    description: `Find restaurants across ${stateName}. Browse by city, neighborhood, cuisine, and occasion with live table availability on Tablevera.`,
    heading: `Restaurants in ${stateName}`,
    intro: `Explore dining across ${stateName} — from major cities to neighborhood favorites — with filters and instant reservations.`,
    faq: [
      {
        question: `How do I find restaurants in ${stateName}?`,
        answer: `This page lists bookable restaurants in ${stateName}. Filter by cuisine, price, occasion, and dietary needs, or jump to a city or neighborhood hub for a tighter search.`,
      },
      {
        question: `Can I search Near Me in ${stateName}?`,
        answer: `Yes. Tap Near Me to center on your location, or open a city, neighborhood, or landmark page in ${stateName} for a map-centered browse.`,
      },
      {
        question: `Is booking in ${stateName} free for diners?`,
        answer: `Yes — Tablevera is free for diners. Deposits, if required, are shown before you confirm and are typically applied to your bill.`,
      },
    ],
  };
}

export function landmarkLandingMeta(
  landmark: string,
  city: string,
  state: string,
): DiscoveryLandingMeta {
  return {
    title: `Restaurants Near ${landmark}, ${city} | Tablevera`,
    description: `Book restaurants near ${landmark} in ${city}, ${state}. Compare cuisine, price, and ratings with live availability.`,
    heading: `Restaurants near ${landmark}`,
    intro: `Dining within reach of ${landmark} — walkable favorites and nearby destinations with real-time reservation slots.`,
    faq: [
      {
        question: `What restaurants are near ${landmark}?`,
        answer: `This page centers search around ${landmark} in ${city}. Filter by cuisine, price, rating, and occasion, then pick a live time slot for your party size.`,
      },
      {
        question: `How far are restaurants from ${landmark}?`,
        answer: `Results prioritize venues near ${landmark}. Use the map view to see distance, or tighten filters by neighborhood and cuisine.`,
      },
      {
        question: `Can I reserve same-day near ${landmark}?`,
        answer: `Often yes. Choose today’s date and party size to see open tables nearby. If a time is full, try adjacent slots or the waitlist.`,
      },
    ],
  };
}

export function restaurantsNearMeInCityMeta(city: string, state: string): DiscoveryLandingMeta {
  const place = `${city}, ${state}`;
  return {
    title: `Restaurants Near Me in ${place} | Tablevera`,
    description: `Find restaurants near me in ${place}. Compare menus, ratings, and live table availability — reserve free on Tablevera.`,
    heading: `Restaurants near me in ${place}`,
    intro: `Browse bookable restaurants near you in ${place}. Tap Near Me for your device location, keep this city as your search center, or jump to food near me and meals near me pages for ${city}.`,
    faq: [
      {
        question: `How do I find restaurants near me in ${place}?`,
        answer: `This page lists restaurants in ${place}. Tap Near Me to use your device location, set your date and party size, then pick a live time slot.`,
      },
      {
        question: `Can I filter restaurants near me in ${city} by cuisine or meal?`,
        answer: `Yes. Use cuisine, meal, price, dietary, and occasion filters — or open food near me and meals near me pages for ${city}.`,
      },
      {
        question: `What is the difference between restaurants near me and top restaurants in ${city}?`,
        answer: `Restaurants near me prioritizes proximity and bookable tables around ${city}. Top restaurants in ${city} highlights highly rated partners; you can combine both ideas with the top-rated filter on this page.`,
      },
      {
        question: `Are restaurant reservations near me in ${city} free?`,
        answer: `Reservations are free for diners. Any per-guest deposit is disclosed before you confirm and is typically applied to your bill.`,
      },
      ...bookingFaq(`restaurants near me in ${place}`),
    ],
  };
}

export function restaurantsNearMeInStateMeta(stateName: string, stateCode: string): DiscoveryLandingMeta {
  return {
    title: `Restaurants Near Me in ${stateName} (${stateCode}) | Tablevera`,
    description: `Find restaurants near me in ${stateName}. Browse by city, cuisine, and meal with live table availability on Tablevera.`,
    heading: `Restaurants near me in ${stateName}`,
    intro: `Explore restaurants near you across ${stateName}. Jump into a city for a tighter search, or filter by cuisine and meal.`,
    faq: [
      {
        question: `How do I find restaurants near me in ${stateName}?`,
        answer: `This page centers on ${stateName}. Tap Near Me for your location, or open a city page like restaurants near me in a ${stateName} city for more precise results.`,
      },
      {
        question: `Can I browse restaurants near me by city in ${stateCode}?`,
        answer: `Yes. Use the related city links for restaurants near me in each city, or open the cities index and pick your town.`,
      },
      {
        question: `Is booking restaurants near me in ${stateName} free?`,
        answer: `Yes for diners. Deposit details, if required, appear before you confirm.`,
      },
    ],
  };
}

export function nearMeLandingMeta(placeLabel?: string): DiscoveryLandingMeta {
  if (placeLabel) {
    return {
      title: `Restaurants Near Me in ${placeLabel} | Tablevera`,
      description: `Find restaurants near me in ${placeLabel} with live table availability. Filter by cuisine, meal, price, and occasion — reserve free on Tablevera.`,
      heading: `Restaurants near me in ${placeLabel}`,
      intro: `Browse bookable restaurants near you in ${placeLabel}. Tap Near Me for your device location, or keep this area as your search center.`,
      faq: [
        {
          question: `How do I find restaurants near me in ${placeLabel}?`,
          answer: `This page centers on ${placeLabel}. Tap Near Me to use your device location, set your date and party size, then pick a live time slot.`,
        },
        {
          question: 'Can I search by city or state instead?',
          answer:
            'Yes. Open Restaurants near me by city or state for pages like restaurants near me in New York, NY or restaurants near me in Florida.',
        },
        {
          question: 'Are nearby reservations free?',
          answer:
            'Reservations are free for diners. Any per-guest deposit is disclosed before you confirm and is typically applied to your bill.',
        },
      ],
    };
  }

  return {
    title: 'Restaurants Near Me — By City & State | Tablevera',
    description:
      'Find restaurants near me by city and state. Browse New York, Miami, Philadelphia, and more with live reservations on Tablevera.',
    heading: 'Restaurants near me',
    intro:
      'Pick a city or state for restaurants near me, or tap Near Me to use your location — then book with live table availability.',
    faq: [
      {
        question: 'How do I find restaurants near me?',
        answer:
          'Tap Near Me to use your device location, or choose restaurants near me in your city or state from the links below.',
      },
      {
        question: 'Do you have restaurants near me by city and state?',
        answer:
          'Yes. Every city and state hub uses the restaurants near me pattern — for example restaurants near me in Miami, FL or restaurants near me in New Jersey.',
      },
      {
        question: 'Is Near Me booking free?',
        answer:
          'Yes for diners. Some restaurants require a refundable deposit per guest applied to your check; details appear before confirmation.',
      },
    ],
  };
}

export function foodNearMeLandingMeta(
  cuisine: string,
  city?: string,
  state?: string,
): DiscoveryLandingMeta {
  const lower = cuisine.toLowerCase();
  if (city && state) {
    const place = `${city}, ${state}`;
    return {
      title: `${cuisine} Restaurants Near Me in ${place} | Tablevera`,
      description: `Find ${lower} restaurants near me in ${place}. Compare menus, ratings, and live availability — reserve free on Tablevera.`,
      heading: `${cuisine} restaurants near me in ${place}`,
      intro: `Craving ${lower} in ${city}? Browse ${lower} restaurants near you with real-time availability, then reserve instantly.`,
      faq: [
        {
          question: `How do I find ${lower} restaurants near me in ${place}?`,
          answer: `This page lists ${cuisine} restaurants in ${place}. Tap Near Me for your device location, set date and party size, then pick an open table.`,
        },
        {
          question: `Can I see all restaurants near me in ${city}?`,
          answer: `Yes. Open restaurants near me in ${place} for every cuisine, or switch to another food near me page for a different cuisine in ${city}.`,
        },
        {
          question: `Are ${lower} restaurant reservations near me in ${city} free?`,
          answer: `Reservations are free for diners. Deposit details, if any, appear before you confirm.`,
        },
      ],
    };
  }

  return {
    title: `${cuisine} Restaurants Near Me | Tablevera`,
    description: `Find ${lower} restaurants near me with live reservations. Pick a city or state, or use Near Me — book free on Tablevera.`,
    heading: `${cuisine} restaurants near me`,
    intro: `Craving ${lower}? Browse ${lower} restaurants near you, then choose a city for restaurants near me in your area.`,
    faq: [
      {
        question: `How do I find ${lower} restaurants near me?`,
        answer: `Tap Near Me on this page, or open a city page for ${lower} restaurants near me in that city and state.`,
      },
      {
        question: `Can I filter ${lower} restaurants near me by city?`,
        answer: `Yes. Use the related city links for ${cuisine} restaurants near me in each city, or browse restaurants near me by city and state.`,
      },
      {
        question: `Are ${lower} restaurants near me reservations free?`,
        answer: `Reservations are free for diners. Deposit details, if any, appear before you confirm.`,
      },
    ],
  };
}

export function mealNearMeLandingMeta(meal: Meal, city?: string, state?: string): DiscoveryLandingMeta {
  const lower = meal.toLowerCase();
  if (city && state) {
    const place = `${city}, ${state}`;
    return {
      title: `${meal} Restaurants Near Me in ${place} | Tablevera`,
      description: `Find ${lower} restaurants near me in ${place} with live table availability. Reserve free on Tablevera.`,
      heading: `${meal} restaurants near me in ${place}`,
      intro: `Looking for ${lower} in ${city}? See restaurants near you tagged for ${lower} with open tables you can book instantly.`,
      faq: [
        {
          question: `How do I find ${lower} restaurants near me in ${place}?`,
          answer: `Keep ${meal} selected on this ${place} page, tap Near Me if needed, set your party size, and pick a live time slot.`,
        },
        {
          question: `Can I see all restaurants near me in ${city}?`,
          answer: `Yes. Open restaurants near me in ${place} for the full list, or switch meals for brunch, lunch, dinner, and more in ${city}.`,
        },
        {
          question: `Is booking ${lower} restaurants near me in ${city} free?`,
          answer: `Yes for diners on Tablevera. Any per-guest deposit is shown before you confirm.`,
        },
      ],
    };
  }

  return {
    title: `${meal} Restaurants Near Me | Tablevera`,
    description: `Find ${lower} restaurants near me with live table availability. Browse by city and state — reserve free on Tablevera.`,
    heading: `${meal} restaurants near me`,
    intro: `Looking for ${lower} nearby? See restaurants tagged for ${lower}, then open a city for restaurants near me in your area.`,
    faq: [
      {
        question: `How do I find ${lower} restaurants near me?`,
        answer: `Tap Near Me to center on your location, or open ${meal} restaurants near me in a specific city and state.`,
      },
      {
        question: `Can I combine ${lower} with a city?`,
        answer: `Yes. Use related city links for ${meal} restaurants near me in each city, or start from restaurants near me by city and state.`,
      },
      {
        question: `Is booking ${lower} restaurants near me free?`,
        answer: `Yes for diners on Tablevera. Any per-guest deposit is shown before you confirm.`,
      },
    ],
  };
}

export function mealSlug(meal: Meal): string {
  return discoverySlug(meal);
}

export function slugToMeal(slug: string): Meal | undefined {
  return MEALS.find((m) => discoverySlug(m) === slug);
}

export function categoryLandingMeta(
  categoryLabel: string,
  city?: string,
  state?: string,
): DiscoveryLandingMeta {
  const lower = categoryLabel.toLowerCase();
  if (city && state) {
    return {
      title: `${categoryLabel} Restaurants in ${city}, ${state} | Tablevera`,
      description: `Discover ${lower} restaurants in ${city}, ${state}. Compare menus, ratings, and live table availability on Tablevera.`,
      heading: `${categoryLabel} restaurants in ${city}`,
      intro: `Browse ${lower} dining in ${city} with filters for price, occasion, and amenities — then reserve instantly.`,
      faq: [
        {
          question: `How do I book ${lower} restaurants in ${city}?`,
          answer: `Open a restaurant on this page, choose your date and party size, and pick an open time slot. Confirmation is instant and free for diners.`,
        },
        {
          question: `Can I combine ${lower} with other filters in ${city}?`,
          answer: `Yes. Add dietary needs, price range, amenities, and occasion tags to refine ${lower} results in ${city}.`,
        },
        {
          question: `Are ${lower} reservations in ${city} free?`,
          answer: `Reservations are free for diners. Deposits, if required, are shown before you confirm.`,
        },
      ],
    };
  }

  return {
    title: `${categoryLabel} Restaurants — Book a Table | Tablevera`,
    description: `Find ${lower} restaurants with live reservations. Filter by city, price, and occasion on Tablevera.`,
    heading: `${categoryLabel} restaurants`,
    intro: `Explore ${lower} dining destinations with real-time availability. Narrow by location, price, and dietary needs.`,
    faq: [
      {
        question: `What is the ${lower} category on Tablevera?`,
        answer: `${categoryLabel} highlights restaurants matching that dining style or cuisine. Combine it with city or Near Me search to find bookable tables nearby.`,
      },
      {
        question: `How do I find ${lower} restaurants near me?`,
        answer: `Open this category page and tap Near Me, or browse a city hub and keep the ${lower} filter applied.`,
      },
      {
        question: `Are ${lower} reservations free?`,
        answer: `Yes for diners. Any deposit requirement is disclosed before you confirm the booking.`,
      },
    ],
  };
}

export function cuisineInCityLandingMeta(
  cuisine: string,
  city: string,
  state: string,
): DiscoveryLandingMeta {
  const lower = cuisine.toLowerCase();
  return {
    title: `Best ${cuisine} Restaurants in ${city}, ${state} | Tablevera`,
    description: `Discover top ${lower} restaurants in ${city}, ${state}. Compare menus, ratings, and live availability — reserve on Tablevera.`,
    heading: `${cuisine} restaurants in ${city}, ${state}`,
    intro: `From neighborhood favorites to destination dining, explore ${lower} spots in ${city} with instant table booking.`,
    faq: [
      {
        question: `How do I book a ${lower} restaurant in ${city}?`,
        answer: `Browse this list, set your date and party size, open a restaurant, and pick a live time slot. Confirmation is free for diners.`,
      },
      {
        question: `Can I filter ${lower} restaurants in ${city} by neighborhood?`,
        answer: `Yes. Use map view or jump to a neighborhood hub, then keep the ${cuisine} cuisine filter to narrow results within ${city}.`,
      },
      {
        question: `Are ${lower} reservations in ${city} free?`,
        answer: `Reservations are free for diners on Tablevera. Deposit details, if any, appear before you confirm.`,
      },
    ],
  };
}
