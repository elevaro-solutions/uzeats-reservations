'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@/lib/apollo-hooks';
import { Button, Card, Col, List, Row, Space, Spin, Statistic, Table, Typography } from 'antd';
import {
  AppstoreOutlined,
  BellOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  MessageOutlined,
  ShopOutlined,
  StarOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { EmptyState, PageHeader, StatusTag, colors, radii, spacing, typography } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { canCreateRestaurant, isPlatformAdmin } from '@/lib/roles';
import {
  MY_NOTIFICATIONS,
  MY_OWNER_OVERVIEW,
  MY_RESTAURANTS,
  MY_SUBSCRIPTION,
} from '@/lib/graphql';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';

const { Text, Paragraph, Title } = Typography;

type OwnerLocationRow = {
  restaurantId: string;
  name: string;
  status: string;
  cuisine: string;
  city: string;
  state: string;
  averageRating: number;
  reviewCount: number;
  todayReservations: number;
  todayCovers: number;
  openWaitlist: number;
  tableCount: number;
  shiftCount: number;
};

const shortcuts = [
  {
    href: '/restaurants',
    title: 'My restaurants',
    desc: 'Locations, status, and setup',
    icon: <ShopOutlined />,
  },
  {
    href: '/reservations',
    title: 'Reservations',
    desc: "Today's book and walk-ins",
    icon: <CalendarOutlined />,
  },
  {
    href: '/waitlist',
    title: 'Waitlist',
    desc: 'Guests waiting for a table',
    icon: <ClockCircleOutlined />,
  },
  {
    href: '/floor-ops',
    title: 'Floor ops',
    desc: 'Seating and table turns',
    icon: <AppstoreOutlined />,
  },
  {
    href: '/messages',
    title: 'Messages',
    desc: 'Guest and inquiry inbox',
    icon: <MessageOutlined />,
  },
  {
    href: '/billing',
    title: 'Billing',
    desc: 'Plan, trial, and invoices',
    icon: <DollarOutlined />,
  },
];

function selectRestaurant(id: string) {
  localStorage.setItem('activeRestaurantId', id);
  window.dispatchEvent(new CustomEvent('rt-restaurant-change', { detail: id }));
}

export default function OverviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), []);

  const { data: overviewData, loading: overviewLoading } = useQuery(MY_OWNER_OVERVIEW, {
    skip: !user,
    variables: { date: today },
    fetchPolicy: 'cache-and-network',
  });
  const { data: notifData } = useQuery(MY_NOTIFICATIONS, {
    skip: !user,
    variables: { limit: 5 },
  });
  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId } = usePartnerRestaurant(restaurants);
  const { data: subData } = useQuery(MY_SUBSCRIPTION, {
    skip: !user || !activeRestaurantId,
    variables: { restaurantId: activeRestaurantId },
  });

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
    if (!authLoading && user && isPlatformAdmin(user.role)) router.replace('/admin');
  }, [authLoading, user, router]);

  const overview = overviewData?.myOwnerOverview;
  const notifications = notifData?.myNotifications ?? [];
  const subscription = subData?.mySubscription;
  const activeRestaurant = restaurants.find((r: { id: string }) => r.id === activeRestaurantId);
  const canAdd = Boolean(user && canCreateRestaurant(user.role));
  const locationsTotal = overview?.locationsTotal ?? 0;
  const locationRows: OwnerLocationRow[] = overview?.locations ?? [];
  const isMultiLocation = locationsTotal > 1;

  const openLocation = (id: string, path: string) => {
    selectRestaurant(id);
    router.push(path);
  };

  if (authLoading || (user && overviewLoading && !overview)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (user && locationsTotal === 0) {
    return (
      <div component="OverviewPage" style={{ display: 'contents' }}>
        <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
          <PageHeader
            title="Overview"
            subtitle="Your service snapshot across all locations"
          />
          <EmptyState
            title="No restaurants yet"
            description="Add your first venue to start taking reservations — or import from DoorDash / Uber Eats."
            action={
              canAdd ? (
                <Link href="/restaurants">
                  <Button type="primary">Go to My restaurants</Button>
                </Link>
              ) : undefined
            }
          />
        </Space>
      </div>
    );
  }

  return (
    <div component="OverviewPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title={isMultiLocation ? 'Multi-location overview' : 'Overview'}
          subtitle={
            isMultiLocation
              ? `Summary across ${locationsTotal} locations for ${dayjs(today).format('MMM D, YYYY')}`
              : "Today's service snapshot"
          }
          extra={
            <Link href="/restaurants">
              <Button icon={<ShopOutlined />}>My restaurants</Button>
            </Link>
          }
        />

        <Row gutter={[16, 16]}>
          <Col xs={12} md={8} lg={4}>
            <Card>
              <Statistic title="Locations" value={overview?.locationsTotal ?? 0} prefix={<ShopOutlined />} />
            </Card>
          </Col>
          <Col xs={12} md={8} lg={4}>
            <Card>
              <Statistic
                title="Today's reservations"
                value={overview?.todayReservations ?? 0}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={8} lg={4}>
            <Card>
              <Statistic
                title="Today's covers"
                value={overview?.todayCovers ?? 0}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={8} lg={4}>
            <Card>
              <Statistic
                title="Open waitlist"
                value={overview?.openWaitlist ?? 0}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={8} lg={4}>
            <Card>
              <Statistic
                title="Unread alerts"
                value={overview?.unreadNotifications ?? 0}
                prefix={<BellOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={8} lg={4}>
            <Card>
              <Statistic
                title="Avg rating"
                value={overview?.averageRating ?? 0}
                precision={1}
                prefix={<StarOutlined />}
                suffix={overview?.reviewCount ? `(${overview.reviewCount})` : undefined}
              />
            </Card>
          </Col>
        </Row>

        {isMultiLocation ? (
          <Card
            title="All locations today"
            extra={
              <Link href="/restaurants">
                <Button type="link" style={{ paddingInline: 0 }}>
                  Manage all
                </Button>
              </Link>
            }
            style={{ borderRadius: radii.lg }}
          >
            <Table<OwnerLocationRow>
              rowKey="restaurantId"
              dataSource={locationRows}
              pagination={false}
              scroll={{ x: 'max-content' }}
              columns={[
                {
                  title: 'Location',
                  key: 'location',
                  render: (_: unknown, row) => {
                    const isInactive = row.status === 'rejected' || row.status === 'suspended';
                    return (
                      <Space orientation="vertical" size={0}>
                        <Text strong style={{ opacity: isInactive ? 0.85 : 1 }}>
                          {row.name}
                        </Text>
                        <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
                          {[row.cuisine, [row.city, row.state].filter(Boolean).join(', ')]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </Text>
                      </Space>
                    );
                  },
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  render: (status: string) => <StatusTag status={status} />,
                },
                {
                  title: 'Reservations',
                  dataIndex: 'todayReservations',
                  width: 120,
                },
                {
                  title: 'Covers',
                  dataIndex: 'todayCovers',
                  width: 100,
                },
                {
                  title: 'Waitlist',
                  dataIndex: 'openWaitlist',
                  width: 100,
                },
                {
                  title: 'Rating',
                  key: 'rating',
                  width: 110,
                  render: (_: unknown, row) =>
                    row.reviewCount > 0 ? `${row.averageRating.toFixed(1)} (${row.reviewCount})` : '—',
                },
                {
                  title: 'Tables / shifts',
                  key: 'capacity',
                  width: 130,
                  render: (_: unknown, row) => `${row.tableCount} / ${row.shiftCount}`,
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  fixed: 'right',
                  width: 260,
                  render: (_: unknown, row) => {
                    const isInactive = row.status === 'rejected' || row.status === 'suspended';
                    return (
                      <Space size={4} wrap>
                        <Button
                          type="link"
                          size="small"
                          disabled={isInactive}
                          style={{ color: isInactive ? undefined : colors.brand[600], paddingInline: 4 }}
                          onClick={() => openLocation(row.restaurantId, '/reservations')}
                        >
                          Reservations
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          disabled={isInactive}
                          style={{ color: isInactive ? undefined : colors.brand[600], paddingInline: 4 }}
                          onClick={() => openLocation(row.restaurantId, '/waitlist')}
                        >
                          Waitlist
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          disabled={isInactive}
                          style={{ color: isInactive ? undefined : colors.brand[600], paddingInline: 4 }}
                          onClick={() => openLocation(row.restaurantId, '/floor-ops')}
                        >
                          Floor
                        </Button>
                      </Space>
                    );
                  },
                },
              ]}
            />
          </Card>
        ) : null}

        <Row gutter={[16, 16]}>
          <Col xs={24} md={isMultiLocation ? 12 : 8}>
            <Card title="Location status" style={{ borderRadius: radii.lg, height: '100%' }}>
              <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Approved</Text>
                  <Text strong>{overview?.locationsActive ?? 0}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Pending approval</Text>
                  <Text strong>{overview?.locationsPending ?? 0}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Inactive</Text>
                  <Text strong>{overview?.locationsInactive ?? 0}</Text>
                </div>
                <Link href="/restaurants">
                  <Button type="link" style={{ paddingInline: 0 }}>
                    Manage locations
                  </Button>
                </Link>
              </Space>
            </Card>
          </Col>

          {!isMultiLocation ? (
            <Col xs={24} md={8}>
              <Card
                title={activeRestaurant ? `Active: ${activeRestaurant.name}` : 'Active location'}
                style={{ borderRadius: radii.lg, height: '100%' }}
              >
                {activeRestaurant ? (
                  <Space orientation="vertical" size={spacing.sm} style={{ width: '100%' }}>
                    <div>
                      <Text type="secondary">Status </Text>
                      <StatusTag status={activeRestaurant.status} />
                    </div>
                    {subscription ? (
                      <>
                        <div>
                          <Text type="secondary">Plan </Text>
                          <Text strong style={{ textTransform: 'capitalize' }}>
                            {subscription.plan}
                          </Text>
                        </div>
                        <div>
                          <Text type="secondary">Billing </Text>
                          <Text strong style={{ textTransform: 'capitalize' }}>
                            {String(subscription.status ?? '').replaceAll('_', ' ')}
                          </Text>
                        </div>
                        {subscription.trialEndsAt ? (
                          <Text type="secondary">
                            Trial ends {dayjs(subscription.trialEndsAt).format('MMM D, YYYY')}
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <Text type="secondary">No subscription loaded for this location.</Text>
                    )}
                    <Space wrap>
                      <Link href="/reservations">
                        <Button type="primary" size="small">
                          Reservations
                        </Button>
                      </Link>
                      <Link href="/billing">
                        <Button size="small">Billing</Button>
                      </Link>
                    </Space>
                  </Space>
                ) : (
                  <Text type="secondary">Select a restaurant from the header to focus service.</Text>
                )}
              </Card>
            </Col>
          ) : (
            <Col xs={24} md={12}>
              <Card title="Focused location" style={{ borderRadius: radii.lg, height: '100%' }}>
                {activeRestaurant ? (
                  <Space orientation="vertical" size={spacing.sm} style={{ width: '100%' }}>
                    <Title level={5} style={{ margin: 0 }}>
                      {activeRestaurant.name}
                    </Title>
                    <div>
                      <Text type="secondary">Status </Text>
                      <StatusTag status={activeRestaurant.status} />
                    </div>
                    {subscription ? (
                      <Text type="secondary">
                        {subscription.plan} · {String(subscription.status ?? '').replaceAll('_', ' ')}
                      </Text>
                    ) : null}
                    <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
                      Header selector controls which location service pages use.
                    </Text>
                    <Space wrap>
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => openLocation(activeRestaurant.id, '/reservations')}
                      >
                        Open reservations
                      </Button>
                      <Link href="/billing">
                        <Button size="small">Billing</Button>
                      </Link>
                    </Space>
                  </Space>
                ) : (
                  <Text type="secondary">Select a restaurant from the header to focus service.</Text>
                )}
              </Card>
            </Col>
          )}

          {!isMultiLocation ? (
            <Col xs={24} md={8}>
              <Card title="Recent alerts" style={{ borderRadius: radii.lg, height: '100%' }}>
                {notifications.length === 0 ? (
                  <Text type="secondary">No recent notifications.</Text>
                ) : (
                  <List
                    size="small"
                    dataSource={notifications}
                    renderItem={(item: {
                      id: string;
                      title: string;
                      body: string;
                      createdAt: string;
                      readAt?: string | null;
                    }) => (
                      <List.Item key={item.id}>
                        <Space orientation="vertical" size={0} style={{ width: '100%' }}>
                          <Text strong style={{ opacity: item.readAt ? 0.75 : 1 }}>
                            {item.title}
                          </Text>
                          <Text type="secondary" ellipsis>
                            {item.body}
                          </Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>
          ) : null}
        </Row>

        {isMultiLocation ? (
          <Card title="Recent alerts" style={{ borderRadius: radii.lg }}>
            {notifications.length === 0 ? (
              <Text type="secondary">No recent notifications.</Text>
            ) : (
              <List
                size="small"
                dataSource={notifications}
                renderItem={(item: {
                  id: string;
                  title: string;
                  body: string;
                  createdAt: string;
                  readAt?: string | null;
                }) => (
                  <List.Item key={item.id}>
                    <Space orientation="vertical" size={0} style={{ width: '100%' }}>
                      <Text strong style={{ opacity: item.readAt ? 0.75 : 1 }}>
                        {item.title}
                      </Text>
                      <Text type="secondary" ellipsis>
                        {item.body}
                      </Text>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        ) : null}

        <Row gutter={[16, 16]}>
          {shortcuts.map((item) => (
            <Col xs={24} sm={12} lg={8} key={item.href}>
              <Card
                hoverable
                style={{ borderRadius: radii.lg, height: '100%' }}
                styles={{ body: { padding: spacing.lg } }}
              >
                <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                  <Text style={{ fontSize: 20, color: colors.brand[600] }}>{item.icon}</Text>
                  <Text strong style={{ fontSize: 16 }}>
                    {item.title}
                  </Text>
                  <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                    {item.desc}
                  </Paragraph>
                  <Link href={item.href}>
                    <Button type="link" style={{ paddingInline: 0 }}>
                      Open
                    </Button>
                  </Link>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Space>
    </div>
  );
}
