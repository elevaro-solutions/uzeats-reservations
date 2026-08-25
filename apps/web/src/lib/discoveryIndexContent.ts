import { discoveryStockImageTerm } from '@reservations/shared';
import { discoveryImageProxyUrl } from '@/lib/magnificStock';

const CITY_SEARCH_TERMS: Record<string, string> = {
  'new-york-ny': 'new york city skyline',
  'brooklyn-ny': 'brooklyn bridge new york',
  'queens-ny': 'queens new york city',
  'buffalo-ny': 'buffalo new york city',
  'rochester-ny': 'rochester new york downtown',
  'albany-ny': 'albany new york capitol',
  'jersey-city-nj': 'jersey city skyline',
  'newark-nj': 'newark new jersey downtown',
  'paterson-nj': 'paterson new jersey',
  'edison-nj': 'edison new jersey',
  'hoboken-nj': 'hoboken new jersey waterfront',
  'princeton-nj': 'princeton new jersey',
  'atlantic-city-nj': 'atlantic city boardwalk',
  'miami-fl': 'miami beach skyline',
  'orlando-fl': 'orlando florida city',
  'tampa-fl': 'tampa florida waterfront',
  'jacksonville-fl': 'jacksonville florida',
  'fort-lauderdale-fl': 'fort lauderdale beach',
  'st-petersburg-fl': 'st petersburg florida',
  'tallahassee-fl': 'tallahassee florida',
  'philadelphia-pa': 'philadelphia skyline',
};

const NEIGHBORHOOD_SEARCH_TERMS: Record<string, string> = {
  'soho-new-york-ny': 'soho new york street',
  'tribeca-new-york-ny': 'tribeca new york',
  'williamsburg-brooklyn-ny': 'williamsburg brooklyn',
  'astoria-queens-ny': 'astoria queens new york',
  'downtown-jersey-city-nj': 'downtown jersey city',
  'brickell-miami-fl': 'brickell miami skyline',
  'center-city-philadelphia-pa': 'center city philadelphia',
  'ybor-city-tampa-fl': 'ybor city tampa',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  romantic: 'Candlelit tables and intimate settings built for date night.',
  italian: 'Fresh pasta, wood-fired pizza, and classic trattoria favorites.',
  brunch: 'Weekend morning spots with eggs, pastries, and lively patios.',
  mexican: 'Tacos, margaritas, and vibrant cantina-style dining.',
  pizza: 'Neapolitan pies, slice shops, and family-friendly pizzerias.',
  seafood: 'Oysters, catch-of-the-day, and waterfront seafood houses.',
  american: 'Burgers, comfort classics, and all-American neighborhood staples.',
  fun: 'Lively atmospheres with music, energy, and groups that stay late.',
  japanese: 'Ramen, izakaya bites, and refined Japanese kitchens.',
  birthdays: 'Party-ready spots with desserts, packages, and group seating.',
  sushi: 'Omakase counters, sushi bars, and fresh nigiri destinations.',
  steak: 'Prime cuts, dry-aged beef, and classic steakhouse service.',
  casual: 'Relaxed vibes, walk-in friendly tables, and everyday favorites.',
  chinese: 'Dim sum, Szechuan heat, and regional Chinese specialties.',
  mediterranean: 'Mezze, grilled seafood, and sun-kissed Mediterranean flavors.',
  indian: 'Curries, tandoor breads, and regional Indian cuisine.',
  groups: 'Large tables, private dining rooms, and party-friendly layouts.',
  'fine-dining': 'Tasting menus, white-tablecloth service, and chef-driven cuisine.',
  'kid-friendly': 'High chairs, kids menus, and family-welcoming atmospheres.',
  tapas: 'Small plates, shared tables, and Spanish-inspired tapas bars.',
};

const OCCASION_DESCRIPTIONS: Record<string, string> = {
  'date-night': 'Intimate lighting, great wine lists, and tables made for two.',
  birthday: 'Celebration-ready venues with desserts, decor, and group seating.',
  anniversary: 'Memorable settings for milestones — from cozy to upscale.',
  'business-meal': 'Professional ambiance, reliable service, and easy downtown access.',
  'family-dinner': 'Welcoming spots with flexible seating and menus for every age.',
  'group-dining': 'Large tables, shareable menus, and private room options.',
  'special-occasion': 'Destination dining for celebrations worth dressing up for.',
  'private-event': 'Buyouts, semi-private spaces, and event-friendly hospitality.',
};

const NEIGHBORHOOD_DESCRIPTIONS: Record<string, string> = {
  'soho-new-york-ny': 'Gallery-lined streets with boutique bistros and see-and-be-seen dining.',
  'tribeca-new-york-ny': 'Refined downtown favorites steps from the waterfront.',
  'williamsburg-brooklyn-ny': 'Trendy tasting menus, waterfront patios, and late-night spots.',
  'astoria-queens-ny': 'Global flavors along one of NYC’s great food corridors.',
  'downtown-jersey-city-nj': 'Walkable downtown with skyline views and diverse kitchens.',
  'brickell-miami-fl': 'High-rise dining, rooftop bars, and Brickell nightlife.',
  'center-city-philadelphia-pa': 'Center City classics from Rittenhouse to Old City.',
  'ybor-city-tampa-fl': 'Historic Ybor with Latin flavors and lively evening energy.',
};

const CITY_DESCRIPTIONS: Record<string, string> = {
  'new-york-ny':
    'Midtown power lunches to downtown date nights — book live tables across the city.',
  'brooklyn-ny': 'Neighborhood gems from Williamsburg to DUMBO with real-time availability.',
  'queens-ny': 'One of the country’s great cuisine corridors — filter by cuisine and book instantly.',
  'buffalo-ny': 'Classic Buffalo dining and neighborhood favorites with live reservations.',
  'rochester-ny': 'Rochester restaurants from downtown to the suburbs — reserve free on Tablevera.',
  'albany-ny': 'Capital-region dining with filters for occasion, price, and dietary needs.',
  'jersey-city-nj': 'Waterfront views and downtown spots an easy hop from Manhattan.',
  'newark-nj': 'Ironbound classics and downtown destinations with instant confirmation.',
  'paterson-nj': 'Diverse Paterson kitchens and family-friendly tables you can book online.',
  'edison-nj': 'Central Jersey favorites with live slots for tonight or weeks ahead.',
  'hoboken-nj': 'Walkable Hoboken date-night spots and casual favorites near the PATH.',
  'princeton-nj': 'College-town dining from cozy bistros to special-occasion destinations.',
  'atlantic-city-nj': 'Boardwalk-adjacent restaurants and casino-corridor dining.',
  'miami-fl': 'Brickell nightlife, beachside seafood, and Latin-inspired kitchens.',
  'orlando-fl': 'Resort corridors and local favorites beyond the theme parks.',
  'tampa-fl': 'Ybor City to waterfront dining — filter by cuisine and party size.',
  'jacksonville-fl': 'Jacksonville spots from the riverfront to beachside neighborhoods.',
  'fort-lauderdale-fl': 'Las Olas and beach dining with live table availability.',
  'st-petersburg-fl': 'Gulf Coast flavors and downtown St. Pete reservation hubs.',
  'tallahassee-fl': 'Capital-city restaurants for business meals and weekend brunch.',
  'philadelphia-pa': 'Center City classics and neighborhood gems — no phone tag required.',
};

export function categoryIndexImageSrc(
  slug: string,
  label: string,
  managedUrl?: string | null,
): string {
  if (managedUrl) return managedUrl;
  return discoveryImageProxyUrl(discoveryStockImageTerm('category', slug, label));
}

export function categoryIndexImageAlt(_slug: string, label: string): string {
  return `${label} dining`;
}

export function cuisineIndexImageSrc(
  slug: string,
  label: string,
  managedUrl?: string | null,
): string {
  if (managedUrl) return managedUrl;
  return discoveryImageProxyUrl(discoveryStockImageTerm('cuisine', slug, label));
}

export function cuisineIndexImageAlt(label: string): string {
  return `${label} cuisine`;
}

export function occasionIndexImageSrc(
  slug: string,
  label: string,
  managedUrl?: string | null,
): string {
  if (managedUrl) return managedUrl;
  return discoveryImageProxyUrl(discoveryStockImageTerm('occasion', slug, label));
}

export function occasionIndexImageAlt(label: string): string {
  return `Restaurants for ${label.toLowerCase()}`;
}

export function landmarkIndexImageSrc(
  slug: string,
  label: string,
  managedUrl?: string | null,
): string {
  if (managedUrl) return managedUrl;
  return discoveryImageProxyUrl(discoveryStockImageTerm('landmark', slug, label));
}

export function landmarkIndexImageAlt(label: string): string {
  return `Restaurants near ${label}`;
}

export function cityIndexImageSrc(slug: string, label: string): string {
  return discoveryImageProxyUrl(
    CITY_SEARCH_TERMS[slug] ?? `restaurants in ${label.toLowerCase()}`,
  );
}

export function cityIndexImageAlt(label: string): string {
  return `Restaurants in ${label}`;
}

export function neighborhoodIndexImageSrc(slug: string, label: string): string {
  return discoveryImageProxyUrl(
    NEIGHBORHOOD_SEARCH_TERMS[slug] ?? `restaurants ${label.toLowerCase()}`,
  );
}

export function neighborhoodIndexImageAlt(label: string): string {
  return `Restaurants in ${label}`;
}

export function categoryIndexDescription(
  slug: string,
  label: string,
  managedDescription?: string | null,
): string {
  if (managedDescription?.trim()) return managedDescription.trim();
  return (
    CATEGORY_DESCRIPTIONS[slug] ??
    `Browse ${label.toLowerCase()} restaurants with live table availability.`
  );
}

export function cuisineIndexDescription(
  label: string,
  managedDescription?: string | null,
): string {
  if (managedDescription?.trim()) return managedDescription.trim();
  return `Explore ${label.toLowerCase()} menus, ratings, and open tables you can reserve instantly.`;
}

export function occasionIndexDescription(
  slug: string,
  label: string,
  managedDescription?: string | null,
): string {
  if (managedDescription?.trim()) return managedDescription.trim();
  return (
    OCCASION_DESCRIPTIONS[slug] ??
    `Find restaurants matched to ${label.toLowerCase()} with filters and live availability.`
  );
}

export function landmarkIndexDescription(
  label: string,
  managedDescription?: string | null,
): string {
  if (managedDescription?.trim()) return managedDescription.trim();
  return `Browse restaurants near ${label} with live table availability.`;
}

export function cityIndexDescription(slug: string, label: string): string {
  return (
    CITY_DESCRIPTIONS[slug] ??
    `Browse bookable restaurants in ${label} — filter by cuisine, price, and occasion.`
  );
}

export function neighborhoodIndexDescription(slug: string, label: string): string {
  return (
    NEIGHBORHOOD_DESCRIPTIONS[slug] ??
    `Walkable dining in ${label} with map search and instant reservations.`
  );
}
