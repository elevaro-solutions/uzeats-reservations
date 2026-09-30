'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import { Button, Card, Space, Spin, Tabs, Typography, message } from 'antd';
import { BookOutlined, DeleteOutlined, HeartOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type MouseEvent } from 'react';
import { PageHeader, EmptyState, priceRangeLabel, colors, radii, shadows } from '@reservations/ui';
import { buildRestaurantBookingPath } from '@reservations/shared';
import { useAuth } from '@/lib/auth';
import {
  MY_SAVED_RESTAURANTS,
  UNSAVE_RESTAURANT,
  UNFAVORITE_RESTAURANT,
} from '@/lib/graphql';

const { Text } = Typography;

type BookmarkKind = 'saved' | 'favorite';

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

function RestaurantList({
  items,
  emptyTitle,
  kind,
}: {
  items: RestaurantItem[];
  emptyTitle: string;
  kind: BookmarkKind;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [unsaveRestaurant] = useMutation(UNSAVE_RESTAURANT, {
    refetchQueries: [{ query: MY_SAVED_RESTAURANTS, variables: { kind: 'saved' } }],
  });
  const [unfavoriteRestaurant] = useMutation(UNFAVORITE_RESTAURANT, {
    refetchQueries: [{ query: MY_SAVED_RESTAURANTS, variables: { kind: 'favorite' } }],
  });

  const handleRemove = async (e: MouseEvent, restaurantId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setRemovingId(restaurantId);
    try {
      if (kind === 'saved') {
        await unsaveRestaurant({ variables: { restaurantId } });
        message.success('Removed from saved');
      } else {
        await unfavoriteRestaurant({ variables: { restaurantId } });
        message.success('Removed from favorites');
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not remove restaurant');
    } finally {
      setRemovingId(null);
    }
  };

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
        <div
          key={r.id}
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            padding: '16px 0',
            borderBottom: idx < arr.length - 1 ? `1px solid ${colors.bordersubtle}` : 'none',
          }}
        >
          <Link
            href={buildRestaurantBookingPath(r.slug, r.id)}
            style={{
              color: 'inherit',
              textDecoration: 'none',
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              flex: 1,
              minWidth: 0,
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
          </Link>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label={kind === 'saved' ? 'Remove from saved' : 'Remove from favorites'}
            loading={removingId === r.id}
            onClick={(e) => void handleRemove(e, r.id)}
            style={{ flexShrink: 0 }}
          >
            Remove
          </Button>
        </div>
      ))}
    </Card>
  );
}

export default function SavedRestaurantsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<BookmarkKind>('saved');

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
        subtitle="Bookmarked spots and favorites — heart a place to get alerts when a table opens up"
      />

      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as BookmarkKind)}
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
              <RestaurantList items={saved} emptyTitle="No saved restaurants" kind="saved" />
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
              <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                <Text type="secondary" style={{ display: 'block' }}>
                  Favorites get table-open alerts when someone cancels within 48 hours.{' '}
                  <Link href="/profile#notifications">Manage alerts</Link>
                </Text>
                <RestaurantList
                  items={favorites}
                  emptyTitle="No favorite restaurants"
                  kind="favorite"
                />
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
