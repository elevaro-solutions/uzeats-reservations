'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Col, Row, Select, Statistic, Typography, Alert } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import { PageHeader, colors, radii } from '@reservations/ui';
import { useQuery } from '@/lib/apollo-hooks';
import { MY_RESTAURANTS, RESTAURANT_LOYALTY_STATS } from '@/lib/graphql';
import { useAuth } from '@/lib/auth';

const { Text, Link } = Typography;

export default function RestaurantLoyaltyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const { data: restaurantsData, loading: restaurantsLoading } = useQuery(MY_RESTAURANTS, {
    skip: !user,
  });

  const restaurants = restaurantsData?.myRestaurants ?? [];

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (restaurants.length === 0) return;
    const stored = localStorage.getItem('activeRestaurantId');
    const match = restaurants.find((r: { id: string }) => r.id === stored);
    setRestaurantId(match?.id ?? restaurants[0].id);
  }, [restaurants]);

  const { data, loading } = useQuery(RESTAURANT_LOYALTY_STATS, {
    variables: { restaurantId: restaurantId! },
    skip: !restaurantId,
  });

  const stats = data?.restaurantLoyaltyStats;

  return (
    <div component="RestaurantLoyaltyPage">
      <PageHeader
        title="Loyalty program"
        subtitle="Track guest points earned and redeemed at your restaurant"
        extra={
          <Select
            style={{ width: 260 }}
            loading={restaurantsLoading}
            value={restaurantId ?? undefined}
            onChange={(id) => {
              setRestaurantId(id);
              localStorage.setItem('activeRestaurantId', id);
            }}
            options={restaurants.map((r: { id: string; name: string }) => ({
              value: r.id,
              label: r.name,
            }))}
          />
        }
      />

      {!stats?.loyaltyEnabled && !loading && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Restaurant loyalty is off"
          description={
            <>
              Enable your program in{' '}
              <Link onClick={() => router.push('/settings')}>Settings → Restaurant loyalty</Link>{' '}
              to start awarding points on completed visits.
            </>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={loading} style={{ borderRadius: radii.lg }}>
            <Statistic
              title="Outstanding points"
              value={stats?.totalOutstandingPoints ?? 0}
              prefix={<TrophyOutlined style={{ color: colors.brand[600] }} />}
            />
            <Text type="secondary">Unredeemed balance across all guests</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={loading} style={{ borderRadius: radii.lg }}>
            <Statistic title="Guests with points" value={stats?.guestsWithPoints ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={loading} style={{ borderRadius: radii.lg }}>
            <Statistic title="Visits awarded" value={stats?.totalVisitsAwarded ?? 0} />
            <Text type="secondary">Completed visits that earned points</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={loading} style={{ borderRadius: radii.lg }}>
            <Statistic title="Earned (30d)" value={stats?.pointsEarned30d ?? 0} suffix="pts" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={loading} style={{ borderRadius: radii.lg }}>
            <Statistic title="Redeemed (30d)" value={stats?.pointsRedeemed30d ?? 0} suffix="pts" />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
