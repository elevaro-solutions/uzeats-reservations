'use client';

import { useQuery } from '@apollo/client/react';
import { Button, Card, Space, Spin, Tabs, Typography } from 'antd';
import { BookOutlined, HeartOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageHeader, EmptyState, priceRangeLabel, colors, radii, shadows } from '@reservations/ui';
import { buildRestaurantBookingPath } from '@reservations/shared';
import { useAuth } from '@/lib/auth';
import { MY_SAVED_RESTAURANTS } from '@/lib/graphql';

const { Text } = Typography;

type RestaurantItem = {
  id: string;
  name: string;
  slug?: string;
  cuisine: string;
  priceRange: number;
  photos?: string[];
  averageRating: number;
  reviewCount: number;
  address?: {
    city?: string;
    state?: string;
    neighborhood?: string;
  };
};

function RestaurantList({ items, emptyTitle }: { items: RestaurantItem[]; emptyTitle: string }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<BookOutlined />}
        title={emptyTitle}
        description="Browse restaurants and save your favorites for quick access later."
        action={
          <Link href="/">
            <Button type="primary">Find a table</Button>
          </Link>
        }
      />
    );
  }

  return (
    <Card
      style={{
        borderRadius: radii.lg,
        border: `1px solid ${colors.bordersubtle}`,
        boxShadow: shadows.sm,
      }}
    >
      {items.map((r, idx, arr) => (
        <Link
          key={r.id}
          href={buildRestaurantBookingPath(r.slug, r.id)}
          style={{ color: 'inherit', textDecoration: 'none' }}
        >
          <div
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              padding: '16px 0',
              borderBottom: idx < arr.length - 1 ? `1px solid ${colors.bordersubtle}` : 'none',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: radii.md,
                overflow: 'hidden',
                flexShrink: 0,
                background: colors.brand[50],
              }}
            >
              {r.photos?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.photos[0]}
                  alt=""
                  width={72}
                  height={72}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              ) : null}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ display: 'block' }}>
                {r.name}
              </Text>
              <Space size={6} wrap style={{ marginTop: 4 }}>
                <Text type="secondary">{r.cuisine}</Text>
                <Text type="secondary">·</Text>
                <Text type="secondary">{priceRangeLabel(r.priceRange)}</Text>
                {r.address?.neighborhood && (
                  <>
                    <Text type="secondary">·</Text>
                    <Text type="secondary">{r.address.neighborhood}</Text>
                  </>
                )}
              </Space>
              {r.averageRating > 0 && (
                <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 13 }}>
                  {r.averageRating.toFixed(1)} ({r.reviewCount} reviews)
                </Text>
              )}
            </div>
          </div>
        </Link>
      ))}
    </Card>
  );
}

export default function SavedRestaurantsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'saved' | 'favorite'>('saved');

  const { data: savedData, loading: savedLoading } = useQuery(MY_SAVED_RESTAURANTS, {
    skip: !user,
    variables: { kind: 'saved' },
  });
  const { data: favoriteData, loading: favoriteLoading } = useQuery(MY_SAVED_RESTAURANTS, {
    skip: !user,
    variables: { kind: 'favorite' },
  });

  if (authLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login?next=/saved');
    return null;
  }

  const saved = (savedData as { mySavedRestaurants?: RestaurantItem[] } | undefined)
    ?.mySavedRestaurants ?? [];
  const favorites = (favoriteData as { mySavedRestaurants?: RestaurantItem[] } | undefined)
    ?.mySavedRestaurants ?? [];

  return (
    <div style={{ maxWidth: 800 }}>
      <PageHeader
        title="Saved restaurants"
        subtitle="Your bookmarked spots and favorites"
      />

      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as 'saved' | 'favorite')}
        items={[
          {
            key: 'saved',
            label: (
              <span>
                <BookOutlined /> Saved ({saved.length})
              </span>
            ),
            children: savedLoading ? (
              <Card loading style={{ minHeight: 120 }} />
            ) : (
              <RestaurantList items={saved} emptyTitle="No saved restaurants" />
            ),
          },
          {
            key: 'favorite',
            label: (
              <span>
                <HeartOutlined /> Favorites ({favorites.length})
              </span>
            ),
            children: favoriteLoading ? (
              <Card loading style={{ minHeight: 120 }} />
            ) : (
              <RestaurantList items={favorites} emptyTitle="No favorite restaurants" />
            ),
          },
        ]}
      />
    </div>
  );
}
