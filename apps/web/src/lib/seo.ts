import type { Metadata } from 'next';

export const DEFAULT_SITE_URL = 'https://tablevera.online';

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/$/, '');
}

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${getSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

export function priceRangeSymbols(level: number): string {
  return '$'.repeat(Math.min(4, Math.max(1, level)));
}

export type BreadcrumbItem = { name: string; href?: string };

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  };
}

export function faqJsonLd(faq: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function itemListJsonLd(params: {
  name: string;
  description: string;
  url: string;
  items: Array<{ name: string; url: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: params.name,
    description: params.description,
    url: absoluteUrl(params.url),
    numberOfItems: params.items.length,
    itemListElement: params.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.url),
    })),
  };
}

export function restaurantJsonLd(restaurant: {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  cuisine: string;
  priceRange: number;
  averageRating?: number;
  reviewCount?: number;
  photos?: string[];
  phone?: string | null;
  website?: string | null;
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    zip: string;
    neighborhood?: string | null;
  };
  location?: { lat: number; lng: number };
  dietaryTags?: string[];
  amenities?: string[];
  meals?: string[];
  openingHoursSpecification?: Array<{
    '@type': 'OpeningHoursSpecification';
    dayOfWeek: string;
    opens: string;
    closes: string;
  }>;
}) {
  const path = restaurant.slug ? `/r/${restaurant.slug}` : `/restaurants/${restaurant.id}`;
  const servesCuisine = [restaurant.cuisine, ...(restaurant.dietaryTags ?? [])].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': ['Restaurant', 'LocalBusiness', 'FoodEstablishment'],
    '@id': absoluteUrl(path),
    name: restaurant.name,
    description:
      restaurant.description ||
      `${restaurant.name} — ${restaurant.cuisine} in ${restaurant.address.city}, ${restaurant.address.state}`,
    url: absoluteUrl(path),
    image: restaurant.photos?.[0] ? [restaurant.photos[0]] : undefined,
    telephone: restaurant.phone ?? undefined,
    sameAs: restaurant.website ? [restaurant.website] : undefined,
    servesCuisine,
    priceRange: priceRangeSymbols(restaurant.priceRange),
    ...(restaurant.averageRating && restaurant.reviewCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: restaurant.averageRating,
            reviewCount: restaurant.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: [restaurant.address.line1, restaurant.address.line2].filter(Boolean).join(', '),
      addressLocality: restaurant.address.city,
      addressRegion: restaurant.address.state,
      postalCode: restaurant.address.zip,
      addressCountry: 'US',
    },
    ...(restaurant.location
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: restaurant.location.lat,
            longitude: restaurant.location.lng,
          },
        }
      : {}),
    ...(restaurant.openingHoursSpecification?.length
      ? { openingHoursSpecification: restaurant.openingHoursSpecification }
      : {}),
    amenityFeature: (restaurant.amenities ?? []).map((name) => ({
      '@type': 'LocationFeatureSpecification',
      name,
      value: true,
    })),
    potentialAction: {
      '@type': 'ReserveAction',
      target: absoluteUrl(path),
      name: 'Reserve a table',
    },
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Tablevera',
    url: getSiteUrl(),
    logo: absoluteUrl('/brand/tablevera_icon_v2.svg'),
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Tablevera',
    url: getSiteUrl(),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${getSiteUrl()}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** Shared Metadata for discovery landing templates. */
export function discoveryLandingMetadata(params: {
  title: string;
  description: string;
  canonicalPath: string;
}): Metadata {
  const url = absoluteUrl(params.canonicalPath);
  return {
    title: params.title,
    description: params.description,
    alternates: { canonical: params.canonicalPath },
    openGraph: {
      type: 'website',
      title: params.title,
      description: params.description,
      url,
      siteName: 'Tablevera',
      images: [{ url: '/brand/tablevera_icon_v2.svg', alt: 'Tablevera' }],
    },
    twitter: {
      card: 'summary',
      title: params.title,
      description: params.description,
      images: ['/brand/tablevera_icon_v2.svg'],
    },
  };
}
