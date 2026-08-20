'use client';

import Link from 'next/link';
import { Typography } from 'antd';
import { TrophyOutlined, FireOutlined, StarOutlined, LinkOutlined } from '@ant-design/icons';
import { citySlug as toCitySlug, cuisineSlug as toCuisineSlug, neighborhoodSlug as toNeighborhoodSlug } from '@reservations/shared';
import { colors } from '@reservations/ui';

const { Title, Text } = Typography;

type FeaturedInEntry = {
  title: string;
  description?: string | null;
  url?: string | null;
  logoUrl?: string | null;
};

type Props = {
  name: string;
  cuisine: string;
  featured?: boolean;
  address: { city: string; state: string; neighborhood?: string | null };
  averageRating?: number;
  reviewCount?: number;
  entries?: FeaturedInEntry[];
};

export function RestaurantFeaturedIn({
  name,
  cuisine,
  featured,
  address,
  averageRating,
  reviewCount,
  entries = [],
}: Props) {
  const cityPath = toCitySlug(address.city, address.state);
  const cuisinePath = toCuisineSlug(cuisine);
  const neighborhoodPath = address.neighborhood
    ? toNeighborhoodSlug(address.neighborhood, address.city, address.state)
    : null;

  const curated = entries.map((item) => ({
    icon: item.logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.logoUrl} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4 }} />
    ) : (
      <LinkOutlined style={{ color: colors.brand[600] }} />
    ),
    title: item.title,
    description: item.description ?? undefined,
    href: item.url ?? undefined,
    external: true,
  }));

  const autoHighlights =
    curated.length > 0
      ? []
      : [
          featured
            ? {
                icon: <TrophyOutlined style={{ color: colors.accent[400] }} />,
                title: 'Tablevera Featured',
                description: `${name} is a featured pick on Tablevera — hand-selected for exceptional dining.`,
              }
            : null,
          (averageRating ?? 0) >= 4.5 && (reviewCount ?? 0) >= 10
            ? {
                icon: <StarOutlined style={{ color: colors.rating }} />,
                title: 'Highly rated',
                description: `Guests rate ${name} ${averageRating!.toFixed(1)} stars across ${reviewCount} reviews.`,
                href: `/top-restaurants/${cityPath}`,
              }
            : null,
          {
            icon: <FireOutlined style={{ color: colors.brand[600] }} />,
            title: `Popular ${cuisine} in ${address.city}`,
            description: `Discover more ${cuisine.toLowerCase()} restaurants in ${address.city}.`,
            href: `/cuisine/${cuisinePath}/${cityPath}`,
          },
          address.neighborhood
            ? {
                icon: <FireOutlined style={{ color: colors.brand[500] }} />,
                title: `${address.neighborhood} favorite`,
                description: `Explore top dining spots in ${address.neighborhood}, ${address.city}.`,
                href: neighborhoodPath ? `/neighborhoods/${neighborhoodPath}` : `/cities/${cityPath}`,
              }
            : {
                icon: <FireOutlined style={{ color: colors.brand[500] }} />,
                title: `${address.city} dining`,
                description: `Explore restaurants in ${address.city}, ${address.state}.`,
                href: `/cities/${cityPath}`,
              },
          {
            icon: <FireOutlined style={{ color: colors.brand[400] }} />,
            title: `Restaurants near me in ${address.city}`,
            description: `Find restaurants near me in ${address.city}, ${address.state}.`,
            href: `/near-me/restaurants/${cityPath}`,
          },
          {
            icon: <FireOutlined style={{ color: colors.brand[300] }} />,
            title: `${cuisine} restaurants near me in ${address.city}`,
            description: `Discover ${cuisine.toLowerCase()} restaurants near me in ${address.city}, ${address.state}.`,
            href: `/near-me/food/${cuisinePath}/${cityPath}`,
          },
        ].filter(Boolean) as Array<{
          icon: React.ReactNode;
          title: string;
          description?: string;
          href?: string;
          external?: boolean;
        }>;

  const highlights = [...curated, ...autoHighlights];

  if (highlights.length === 0) return null;

  return (
    <section className="rt-restaurant-section">
      <Title level={3} className="rt-restaurant-section__title">
        Featured in
      </Title>
      <div className="rt-restaurant-featured-grid">
        {highlights.map((item) => (
          <div key={item.title} className="rt-restaurant-featured-card">
            <div className="rt-restaurant-featured-card__icon">{item.icon}</div>
            <div>
              <Text strong>{item.title}</Text>
              {item.description && (
                <Text type="secondary" className="rt-restaurant-featured-card__desc">
                  {item.description}
                </Text>
              )}
              {item.href &&
                (item.external ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rt-restaurant-link"
                    style={{ display: 'inline-block', marginTop: 6 }}
                  >
                    Read more →
                  </a>
                ) : (
                  <Link href={item.href} className="rt-restaurant-link" style={{ display: 'inline-block', marginTop: 6 }}>
                    Explore →
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
