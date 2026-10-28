import type { Metadata } from 'next';
import { MOBILE_APPS, buildRestaurantBookingPath } from '@reservations/shared';

export const DEFAULT_SITE_URL = 'https://tablevera.online';
export const DEFAULT_OG_IMAGE_PATH = '/images/hero-restaurant.jpg';
export const ORGANIZATION_LOGO_PATH = '/brand/apple-touch-icon.png';

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/$/, '');
}

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${getSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

export function defaultOgImages(alt = 'Tablevera — find and book restaurants') {
  return [{ url: absoluteUrl(DEFAULT_OG_IMAGE_PATH), alt }];
}

function socialSameAs(): string[] {
  const fromEnv = [
    process.env.NEXT_PUBLIC_LINKEDIN_URL,
    process.env.NEXT_PUBLIC_INSTAGRAM_URL,
    process.env.NEXT_PUBLIC_FACEBOOK_URL,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return [...new Set([...fromEnv, MOBILE_APPS.diner.androidUrl, MOBILE_APPS.partner.androidUrl])];
}

export const HOME_FAQ = [
  {
    question: 'How do I book a restaurant on Tablevera?',
    answer:
      'Search by city, neighbourhood, or cuisine, pick a restaurant, choose a date and party size, then confirm an open time slot. Confirmation is instant and free for diners.',
  },
  {
    question: 'Is Tablevera free for diners?',
    answer:
      'Yes. Booking a table on Tablevera is free for diners. Some restaurants ask for a refundable deposit per guest that is applied to your bill; any deposit is shown before you confirm.',
  },
  {
    question: 'Can I find restaurants by city or cuisine?',
    answer:
      'Yes. Open a city hub such as restaurants in Key West or Brooklyn, or a cuisine hub such as Uzbek or Italian restaurants, then filter by price, occasion, and amenities.',
  },
];

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
  logoUrl?: string | null;
  phone?: string | null;
  website?: string | null;
  menuUrl?: string | null;
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
  reservationsEnabled?: boolean | null;
  openingHoursSpecification?: Array<{
    '@type': 'OpeningHoursSpecification';
    dayOfWeek: string;
    opens: string;
    closes: string;
  }>;
}) {
  const path = buildRestaurantBookingPath(restaurant.slug, restaurant.id);
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
    logo: restaurant.logoUrl || restaurant.photos?.[0] || undefined,
    telephone: restaurant.phone ?? undefined,
    sameAs: restaurant.website ? [restaurant.website] : undefined,
    acceptsReservations: restaurant.reservationsEnabled !== false,
    ...(restaurant.menuUrl ? { hasMenu: restaurant.menuUrl, menu: restaurant.menuUrl } : {}),
    servesCuisine,
    priceRange: priceRangeSymbols(restaurant.priceRange),
    ...(restaurant.averageRating && (restaurant.reviewCount ?? 0) >= 1
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
      name: 'Reserve a table',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: absoluteUrl(path),
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform',
        ],
      },
    },
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Tablevera',
    url: getSiteUrl(),
    logo: absoluteUrl(ORGANIZATION_LOGO_PATH),
    email: 'support@tablevera.online',
    telephone: '+16507707788',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '20844 Waterbeach Place',
      addressLocality: 'Sterling',
      addressRegion: 'VA',
      postalCode: '20165',
      addressCountry: 'US',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@tablevera.online',
      telephone: '+16507707788',
      url: absoluteUrl('/contact'),
    },
    ...(socialSameAs().length ? { sameAs: socialSameAs() } : {}),
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

export function softwareApplicationJsonLd() {
  const sameAs = socialSameAs();
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Tablevera',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web, Android',
    url: getSiteUrl(),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function articleJsonLd(post: {
  title: string;
  slug: string;
  excerpt?: string | null;
  bodyHtml?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: string | Date | null;
  updatedAt?: string | Date | null;
  seoDescription?: string | null;
  authorName?: string | null;
  tags?: string[];
}) {
  const path = `/blog/${post.slug}`;
  const description =
    post.seoDescription ||
    post.excerpt ||
    `${post.title} — Tablevera restaurant reservations insights`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description,
    url: absoluteUrl(path),
    mainEntityOfPage: absoluteUrl(path),
    image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    dateModified: post.updatedAt
      ? new Date(post.updatedAt).toISOString()
      : post.publishedAt
        ? new Date(post.publishedAt).toISOString()
        : undefined,
    author: {
      '@type': 'Person',
      name: post.authorName || 'Tablevera',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Tablevera',
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl(ORGANIZATION_LOGO_PATH),
      },
    },
    keywords: post.tags?.length ? post.tags.join(', ') : undefined,
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
      images: defaultOgImages(params.title),
    },
    twitter: {
      card: 'summary_large_image',
      title: params.title,
      description: params.description,
      images: [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
    },
  };
}

/** WebPage schema with speakable FAQ-friendly copy for answer engines. */
export function webPageJsonLd(params: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: params.name,
    description: params.description,
    url: absoluteUrl(params.url),
    isPartOf: {
      '@type': 'WebSite',
      name: 'Tablevera',
      url: getSiteUrl(),
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '.rt-discovery-seo', '.rt-discovery-landing__footer'],
    },
  };
}

/** HowTo schema for “book a table” flows cited by answer engines. */
export function howToBookJsonLd(placeLabel?: string) {
  const name = placeLabel
    ? `How to book a restaurant in ${placeLabel} on Tablevera`
    : 'How to book a restaurant on Tablevera';
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description:
      'Find a restaurant on Tablevera, choose date and party size, pick a live time slot, and confirm instantly — free for diners.',
    totalTime: 'PT5M',
    step: [
      {
        '@type': 'HowToStep',
        name: 'Choose a location or Near Me',
        text: 'Open a city, cuisine, neighborhood, landmark, or near-me page — or tap Near Me to use your device location.',
      },
      {
        '@type': 'HowToStep',
        name: 'Set date and party size',
        text: 'Select when you want to dine and how many guests so results show bookable tables.',
      },
      {
        '@type': 'HowToStep',
        name: 'Pick a restaurant and time slot',
        text: 'Open a restaurant page, review ratings, amenities, and deposit details, then choose an open time.',
      },
      {
        '@type': 'HowToStep',
        name: 'Confirm your reservation',
        text: 'Add special requests if needed and confirm. Reservations are free for diners; any deposit is shown before you book.',
      },
    ],
  };
}
