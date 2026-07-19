'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Card,
  Col,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { colors } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { MY_RESTAURANTS, RESTAURANT_RESERVATIONS } from '@/lib/graphql';

const { Title, Text } = Typography;

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const client = useApolloClient();
  const [restaurantId, setRestaurantId] = useState<string>();
  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const [allReservations, setAllReservations] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    const saved = localStorage.getItem('activeRestaurantId');
    setRestaurantId(saved ?? restData?.myRestaurants?.[0]?.id);
  }, [restData]);

  const fetchAllDays = useCallback(async (resId: string) => {
    setFetching(true);
    try {
      const promises = Array.from({ length: 30 }, (_, i) => {
        const date = dayjs().subtract(29 - i, 'day').format('YYYY-MM-DD');
        return client.query({
          query: RESTAURANT_RESERVATIONS,
          variables: { restaurantId: resId, date },
          fetchPolicy: 'cache-first',
        });
      });
      const results = await Promise.all(promises);
      const all = results.flatMap((r) => r.data?.restaurantReservations ?? []);
      setAllReservations(all);
    } finally {
      setFetching(false);
    }
  }, [client]);

  useEffect(() => {
    if (restaurantId) fetchAllDays(restaurantId);
  }, [restaurantId, fetchAllDays]);

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = { confirmed: 0, completed: 0, cancelled: 0, no_show: 0 };
    let totalPartySize = 0;
    let thisMonthCovers = 0;
    const slotCounts: Record<string, number> = {};
    const last7Days: Record<string, number> = {};

    const thisMonth = dayjs().format('YYYY-MM');
    for (let i = 6; i >= 0; i--) {
      last7Days[dayjs().subtract(i, 'day').format('YYYY-MM-DD')] = 0;
    }

    for (const r of allReservations) {
      const status = r.status?.toLowerCase();
      if (status && byStatus[status] !== undefined) byStatus[status]++;
      totalPartySize += r.partySize ?? 0;

      const rDate = r.slotStart?.slice(0, 10);
      if (rDate?.startsWith(thisMonth)) {
        thisMonthCovers += r.partySize ?? 0;
      }
      if (rDate && last7Days[rDate] !== undefined) {
        last7Days[rDate]++;
      }

      const hour = r.slotStart?.slice(11, 16);
      if (hour) slotCounts[hour] = (slotCounts[hour] ?? 0) + 1;
    }

    const avgPartySize = allReservations.length > 0 ? (totalPartySize / allReservations.length).toFixed(1) : '0';

    const topSlots = Object.entries(slotCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { byStatus, avgPartySize, thisMonthCovers, last7Days, topSlots };
  }, [allReservations]);

  const maxDaily = Math.max(...Object.values(stats.last7Days), 1);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Analytics</Title>
      <Select
        style={{ width: 280 }}
        value={restaurantId}
        onChange={(id) => {
          setRestaurantId(id);
          localStorage.setItem('activeRestaurantId', id);
        }}
        options={(restData?.myRestaurants ?? []).map((r: any) => ({ value: r.id, label: r.name }))}
      />

      {fetching ? (
        <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}>
              <Card>
                <Statistic
                  title="Confirmed"
                  value={stats.byStatus.confirmed}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: colors.info }}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card>
                <Statistic
                  title="Completed"
                  value={stats.byStatus.completed}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card>
                <Statistic
                  title="Cancelled"
                  value={stats.byStatus.cancelled}
                  prefix={<CloseCircleOutlined />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card>
                <Statistic
                  title="No-show"
                  value={stats.byStatus.no_show}
                  prefix={<ExclamationCircleOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={12} md={8}>
              <Card>
                <Statistic title="Avg party size" value={stats.avgPartySize} />
              </Card>
            </Col>
            <Col xs={12} md={8}>
              <Card>
                <Statistic title="Total covers (this month)" value={stats.thisMonthCovers} />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card>
                <Statistic title="Total reservations (30 days)" value={allReservations.length} />
              </Card>
            </Col>
          </Row>

          <Card title="Reservations per day (last 7 days)">
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {Object.entries(stats.last7Days).map(([date, count]) => (
                <div key={date} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Text style={{ width: 80, flexShrink: 0 }}>{dayjs(date).format('ddd M/D')}</Text>
                  <Progress
                    percent={Math.round((count / maxDaily) * 100)}
                    format={() => count}
                    strokeColor={colors.brand[600]}
                    style={{ flex: 1 }}
                  />
                </div>
              ))}
            </Space>
          </Card>

          <Card title="Top time slots">
            {stats.topSlots.length === 0 ? (
              <Text type="secondary">No reservation data</Text>
            ) : (
              <Space direction="vertical" size={4}>
                {stats.topSlots.map(([slot, count]) => (
                  <div key={slot} style={{ display: 'flex', gap: 12 }}>
                    <Text strong style={{ width: 60 }}>{slot}</Text>
                    <Text type="secondary">{count} reservation{count !== 1 ? 's' : ''}</Text>
                  </div>
                ))}
              </Space>
            )}
          </Card>
        </>
      )}
    </Space>
  );
}
