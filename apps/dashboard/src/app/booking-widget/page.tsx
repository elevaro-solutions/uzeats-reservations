'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@/lib/apollo-hooks';
import { Button, Card, Divider, Space, Spin } from 'antd';
import { BookingSharePanel } from '@/components/BookingSharePanel';
import { WidgetThemeEditor } from '@/components/WidgetThemeEditor';
import { EmptyState, PageHeader, radii, spacing } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { isPlatformAdmin } from '@/lib/roles';
import { MY_RESTAURANTS, RESTAURANT_SETTINGS } from '@/lib/graphql';
import { useActiveRestaurant } from '@/lib/useActiveRestaurant';

export default function BookingWidgetPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, loading: dataLoading } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurantIds = useMemo(
    () => (data?.myRestaurants ?? []).map((r: { id: string }) => r.id),
    [data],
  );
  const { restaurantId } = useActiveRestaurant(restaurantIds);
  const restaurant = (data?.myRestaurants ?? []).find(
    (r: { id: string }) => r.id === restaurantId,
  );
  const { data: settingsData, loading: settingsLoading } = useQuery(RESTAURANT_SETTINGS, {
    skip: !restaurantId,
    variables: { id: restaurantId },
  });

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
    if (!authLoading && user && isPlatformAdmin(user.role)) router.replace('/admin');
  }, [authLoading, user, router]);

  if (authLoading || dataLoading || settingsLoading) {
    return (
      <div component="BookingWidgetPage" style={{ display: 'contents' }}>
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div component="BookingWidgetPage" style={{ display: 'contents' }}>
        <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
          <PageHeader
            title="Booking widget"
            subtitle="Copy your embed script and booking link for your website and Google"
          />
          <EmptyState
            title="No restaurant selected"
            description="Add a restaurant from Overview, then return here to copy your embed script."
            action={
              <Button type="primary" onClick={() => router.push('/')}>
                Go to Overview
              </Button>
            }
          />
        </Space>
      </div>
    );
  }

  const widgetTheme = settingsData?.restaurant?.widgetTheme;

  return (
    <div component="BookingWidgetPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Booking widget"
          subtitle={`Share and embed online booking for ${restaurant.name}`}
        />

        <Card
          className="rt-surface-card"
          styles={{ body: { padding: spacing.lg } }}
          style={{ borderRadius: radii.lg }}
        >
          <WidgetThemeEditor restaurantId={restaurant.id} initialTheme={widgetTheme}>
            {(theme) => (
              <>
                <Divider style={{ margin: `${spacing.md}px 0 ${spacing.lg}px` }} />
                <BookingSharePanel restaurant={restaurant} widgetTheme={theme} />
              </>
            )}
          </WidgetThemeEditor>
        </Card>
      </Space>
    </div>
  );
}
