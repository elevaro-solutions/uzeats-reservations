'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@/lib/apollo-hooks';
import { Button, Card, Col, Progress, Row, Space, Spin, Typography } from 'antd';
import { CopyOutlined, RocketOutlined } from '@ant-design/icons';
import { buildRestaurantBookingUrl } from '@reservations/shared';
import { BookingSharePanel, copyBookingText } from '@/components/BookingSharePanel';
import { SetupChecklist } from '@/components/SetupGuide';
import { EmptyState, PageHeader, StatusTag, colors, radii, spacing } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { isPlatformAdmin } from '@/lib/roles';
import { MY_RESTAURANTS_SHELL } from '@/lib/graphql';
import { ADD_RESTAURANT_HREF } from '@/lib/restaurants';
import { useActiveRestaurant } from '@/lib/useActiveRestaurant';
import { useSetupGuide } from '@/lib/useSetupGuide';
import { getPublicWebUrl } from '@/lib/webUrl';

const { Text, Paragraph, Title } = Typography;

export default function OnboardingPage() {
  const { user, loading: authLoading, isImpersonating } = useAuth();
  const router = useRouter();
  const { data, loading: dataLoading } = useQuery(MY_RESTAURANTS_SHELL, { skip: !user });
  const restaurants = data?.myRestaurants ?? [];
  const restaurantIds = useMemo(
    () => restaurants.map((r: { id: string }) => r.id),
    [restaurants],
  );
  const { restaurantId } = useActiveRestaurant(restaurantIds);
  const restaurant = restaurants.find((r: { id: string }) => r.id === restaurantId);
  const isAdmin = user ? isPlatformAdmin(user.role) && !isImpersonating : false;
  const { guide, progress, local } = useSetupGuide({ user, isAdmin, restaurant });

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
    if (!authLoading && isAdmin) router.replace('/admin/setup');
  }, [authLoading, user, isAdmin, router]);

  if (authLoading || dataLoading) {
    return (
      <div component="OnboardingPage" style={{ display: 'contents' }}>
        <div style={{ display: 'grid', placeItems: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!restaurants.length) {
    return (
      <div component="OnboardingPage" style={{ display: 'contents' }}>
        <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
          <PageHeader
            title="Get started"
            subtitle="Set up your restaurant before taking reservations"
          />
          <EmptyState
            icon={<RocketOutlined />}
            title="No restaurants yet"
            description="Add your first venue to begin the setup guide."
            action={
              <Button type="primary" onClick={() => router.push(ADD_RESTAURANT_HREF)}>
                Add restaurant
              </Button>
            }
          />
        </Space>
      </div>
    );
  }

  const bookingUrl = restaurant
    ? buildRestaurantBookingUrl(getPublicWebUrl(), { slug: restaurant.slug, id: restaurant.id })
    : '';

  return (
    <div component="OnboardingPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Get started"
          subtitle={
            restaurant
              ? `Finish setting up ${restaurant.name} before you start taking reservations`
              : 'Finish setting up your restaurant'
          }
          extra={
            <Space wrap>
              {guide && local.state.hidden && (
                <Button onClick={() => local.setHidden(false)}>Show setup guide</Button>
              )}
              {progress.allRequiredComplete && (
                <Button type="primary" onClick={() => router.push('/reservations')}>
                  Open reservations
                </Button>
              )}
            </Space>
          }
        />

        {restaurant && (
          <Card
            className="rt-surface-card"
            style={{ borderRadius: radii.lg }}
            styles={{ body: { padding: spacing.lg } }}
          >
            <Row gutter={[24, 24]} align="middle">
              <Col xs={24} md={16}>
                <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <Title level={4} style={{ margin: 0 }}>
                      {restaurant.name}
                    </Title>
                    <StatusTag status={restaurant.status} />
                  </div>
                  <Text type="secondary">
                    {progress.allRequiredComplete
                      ? 'You are ready to take reservations. Finish the optional steps to get the most out of Tablevera.'
                      : `${progress.completedRequired} of ${progress.totalRequired} required steps done. Most owners finish in under 15 minutes.`}
                  </Text>
                </Space>
              </Col>
              <Col xs={24} md={8}>
                <div style={{ textAlign: 'right' }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    {progress.completed} of {progress.total} steps complete
                  </Text>
                  <Progress
                    percent={progress.percent}
                    strokeColor={colors.brand[600]}
                    format={(value) => `${value}%`}
                  />
                </div>
              </Col>
            </Row>
          </Card>
        )}

        {guide && (
          <SetupChecklist
            guide={guide}
            local={local}
            renderTaskExtra={(task) =>
              task.key === 'share' && restaurant && !task.blockedReason ? (
                <div
                  style={{
                    padding: 12,
                    borderRadius: radii.md,
                    background: colors.neutral[50],
                    border: `1px solid ${colors.bordersubtle}`,
                  }}
                >
                  <BookingSharePanel restaurant={restaurant} showBookingLink={false} />
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      copyBookingText(bookingUrl);
                      local.markVisited('share');
                    }}
                    style={{ marginTop: 8 }}
                  >
                    Copy booking link
                  </Button>
                </div>
              ) : null
            }
          />
        )}

        {progress.allRequiredComplete && restaurant?.status === 'approved' && (
          <Card
            style={{
              borderRadius: radii.lg,
              border: `1px solid ${colors.brand[200]}`,
              background: colors.brand[50],
            }}
            styles={{ body: { padding: spacing.lg } }}
          >
            <Space orientation="vertical" size={12} style={{ width: '100%' }}>
              <Title level={5} style={{ margin: 0 }}>
                You are live
              </Title>
              <Paragraph style={{ margin: 0, color: colors.textSecondary }}>
                Guests can book at{' '}
                <Link href={bookingUrl} target="_blank" rel="noopener noreferrer">
                  {bookingUrl}
                </Link>
                . Head to Reservations to manage incoming bookings.
              </Paragraph>
              <Space wrap>
                <Button type="primary" onClick={() => router.push('/reservations')}>
                  View reservations
                </Button>
                <Button onClick={() => router.push('/booking-widget')}>Copy booking script</Button>
              </Space>
            </Space>
          </Card>
        )}
      </Space>
    </div>
  );
}
