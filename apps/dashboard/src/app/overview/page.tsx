'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Col,
  Drawer,
  Dropdown,
  List,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  AppstoreOutlined,
  BellOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  MessageOutlined,
  MoreOutlined,
  PlusOutlined,
  RightOutlined,
  ShopOutlined,
  StarOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PLATFORM_TIMEZONE, todayIsoInTimeZone } from '@reservations/shared';
import { EmptyState, PageHeader, StatusTag, colors, radii, spacing, typography } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { canCreateRestaurant, isHostRole, isPlatformAdmin, partnerLandingPath } from '@/lib/roles';
import {
  MARK_NOTIFICATIONS_READ,
  MY_NOTIFICATIONS,
  MY_OWNER_OVERVIEW,
  MY_RESTAURANTS,
  MY_SUBSCRIPTION,
} from '@/lib/graphql';
import {
  type AppNotification,
  formatRelativeTime,
  notificationHref,
} from '@/lib/notificationLinks';
import { ADD_RESTAURANT_HREF, isInactiveRestaurant, restaurantHref } from '@/lib/restaurants';
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
    title: 'Live floor',
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

function StatLinkCard({
  href,
  title,
  value,
  prefix,
  suffix,
  precision,
}: {
  href: string;
  title: string;
  value: number;
  prefix: ReactNode;
  suffix?: React.ReactNode;
  precision?: number;
}) {
  return (
    <Link href={href} style={{ display: 'block', width: '100%', height: '100%' }}>
      <Card hoverable style={{ height: '100%' }}>
        <Statistic title={title} value={value} prefix={prefix} suffix={suffix} precision={precision} />
      </Card>
    </Link>
  );
}

export default function OverviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedAlert, setSelectedAlert] = useState<AppNotification | null>(null);

  // Omit date so API uses each location's restaurant-local "today"
  const { data: overviewData, loading: overviewLoading } = useQuery(MY_OWNER_OVERVIEW, {
    skip: !user,
    fetchPolicy: 'cache-and-network',
  });
  const overviewTodayLabel = useMemo(
    () => dayjs(todayIsoInTimeZone(PLATFORM_TIMEZONE)).format('MMM D, YYYY'),
    [],
  );
  const { data: notifData, refetch: refetchNotifs } = useQuery(MY_NOTIFICATIONS, {
    skip: !user,
    variables: { limit: 10 },
  });
  const [markRead] = useMutation(MARK_NOTIFICATIONS_READ, {
    refetchQueries: [{ query: MY_NOTIFICATIONS, variables: { limit: 10 } }],
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
    if (!authLoading && user && isHostRole(user.role)) {
      router.replace(partnerLandingPath(user.role));
    }
  }, [authLoading, user, router]);

  const overview = overviewData?.myOwnerOverview;
  const notifications: AppNotification[] = notifData?.myNotifications?.items ?? [];
  const subscription = subData?.mySubscription;
  const activeRestaurant = restaurants.find((r: { id: string }) => r.id === activeRestaurantId);
  const canAdd = Boolean(user && canCreateRestaurant(user.role));
  const locationsTotal = overview?.locationsTotal ?? 0;
  const locationRows: OwnerLocationRow[] = overview?.locations ?? [];
  const isMultiLocation = locationsTotal > 1;

  const openLocation = (id: string, path: string) => {
    selectRestaurant(id);
    router.push(restaurantHref(path, id));
  };

  const openAlert = async (item: AppNotification) => {
    setSelectedAlert(item);
    if (!item.readAt) {
      try {
        await markRead({ variables: { ids: [item.id] } });
        await refetchNotifs();
      } catch {
        // Drawer still opens with the alert content.
      }
    }
  };

  const locationActionItems = (row: OwnerLocationRow): MenuProps['items'] => {
    const inactive = isInactiveRestaurant(row.status);
    return [
      {
        key: 'reservations',
        icon: <CalendarOutlined />,
        label: 'Reservations',
        disabled: inactive,
        onClick: () => openLocation(row.restaurantId, '/reservations'),
      },
      {
        key: 'waitlist',
        icon: <ClockCircleOutlined />,
        label: 'Waitlist',
        disabled: inactive,
        onClick: () => openLocation(row.restaurantId, '/waitlist'),
      },
      {
        key: 'floor',
        icon: <AppstoreOutlined />,
        label: 'Floor',
        disabled: inactive,
        onClick: () => openLocation(row.restaurantId, '/floor-ops'),
      },
    ];
  };

  const alertsCard = (
    <Card
      id="recent-alerts"
      title="Recent alerts"
      extra={
        <Link href="/notifications">
          <Button type="link" style={{ paddingInline: 0 }}>
            Settings
          </Button>
        </Link>
      }
      style={{ borderRadius: radii.lg, height: '100%' }}
    >
      {notifications.length === 0 ? (
        <Text type="secondary">No recent notifications.</Text>
      ) : (
        <List
          size="small"
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              style={{ cursor: 'pointer', paddingInline: 0 }}
              onClick={() => void openAlert(item)}
              actions={[<RightOutlined key="open" style={{ color: colors.neutral[400] }} />]}
            >
              <Space orientation="vertical" size={0} style={{ width: '100%', minWidth: 0 }}>
                <Text strong style={{ opacity: item.readAt ? 0.75 : 1 }}>
                  {item.title}
                </Text>
                <Text type="secondary" ellipsis>
                  {item.body}
                </Text>
                <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
                  {formatRelativeTime(item.createdAt)}
                </Text>
              </Space>
            </List.Item>
          )}
        />
      )}
    </Card>
  );

  if (authLoading || (user && overviewLoading && !overview)) {
    return (
      <div className="rt-page-loader">
        <Spin size="large" />
      </div>
    );
  }

  if (user && locationsTotal === 0) {
    return (
      <div component="OverviewPage" style={{ display: 'contents' }}>
        <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
          <PageHeader title="Overview" subtitle="Your service snapshot across all locations" />
          <EmptyState
            title="No restaurants yet"
            description="Add your first venue to start taking reservations — or import from DoorDash / Uber Eats."
            action={
              canAdd ? (
                <Link href={ADD_RESTAURANT_HREF}>
                  <Button type="primary" icon={<PlusOutlined />}>
                    Add restaurant
                  </Button>
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
              ? `Summary across ${locationsTotal} locations for ${overviewTodayLabel}`
              : "Today's service snapshot"
          }
          extra={
            canAdd ? (
              <Link href={ADD_RESTAURANT_HREF}>
                <Button type="primary" icon={<PlusOutlined />}>
                  Add restaurant
                </Button>
              </Link>
            ) : undefined
          }
        />

        <Row gutter={[16, 16]} className="rt-stat-grid">
          <Col xs={12} md={8} lg={8}>
            <StatLinkCard
              href="/restaurants"
              title="Locations"
              value={overview?.locationsTotal ?? 0}
              prefix={<ShopOutlined />}
            />
          </Col>
          <Col xs={12} md={8} lg={8}>
            <StatLinkCard
              href="/reservations"
              title="Today's reservations"
              value={overview?.todayReservations ?? 0}
              prefix={<CalendarOutlined />}
            />
          </Col>
          <Col xs={12} md={8} lg={8}>
            <StatLinkCard
              href="/reservations"
              title="Today's covers"
              value={overview?.todayCovers ?? 0}
              prefix={<TeamOutlined />}
            />
          </Col>
          <Col xs={12} md={8} lg={8}>
            <StatLinkCard
              href="/waitlist"
              title="Open waitlist"
              value={overview?.openWaitlist ?? 0}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col xs={12} md={8} lg={8}>
            <StatLinkCard
              href="#recent-alerts"
              title="Unread alerts"
              value={overview?.unreadNotifications ?? 0}
              prefix={<BellOutlined />}
            />
          </Col>
          <Col xs={12} md={8} lg={8}>
            <StatLinkCard
              href="/reviews"
              title="Avg rating"
              value={overview?.averageRating ?? 0}
              precision={1}
              prefix={<StarOutlined />}
              suffix={overview?.reviewCount ? `(${overview.reviewCount})` : undefined}
            />
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
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} locations`,
              }}
              scroll={{ x: 'max-content' }}
              columns={[
                {
                  title: 'Location',
                  key: 'location',
                  render: (_: unknown, row) => {
                    const isInactive = isInactiveRestaurant(row.status);
                    return (
                      <Space orientation="vertical" size={0}>
                        <Link
                          href={restaurantHref('/restaurant-profile', row.restaurantId)}
                          style={{
                            fontWeight: 600,
                            color: colors.brand[600],
                            opacity: isInactive ? 0.85 : 1,
                          }}
                        >
                          {row.name}
                        </Link>
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
                  width: 90,
                  render: (_: unknown, row) => (
                    <Dropdown
                      menu={{ items: locationActionItems(row) }}
                      trigger={['click']}
                      placement="bottomRight"
                    >
                      <Button size="small" icon={<MoreOutlined />}>
                        More
                      </Button>
                    </Dropdown>
                  ),
                },
              ]}
            />
          </Card>
        ) : null}

        <Row gutter={[16, 16]} className="rt-stat-grid">
          <Col xs={24} md={isMultiLocation ? 8 : 8}>
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
            <Col xs={24} md={8}>
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

          <Col xs={24} md={8}>
            {alertsCard}
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="rt-stat-grid">
          {shortcuts.map((item) => (
            <Col xs={24} sm={12} lg={8} key={item.href}>
              <Link href={item.href} style={{ display: 'block', height: '100%' }}>
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
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                      {item.desc}
                    </Paragraph>
                  </Space>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </Space>

      <Drawer
        title={selectedAlert?.title ?? 'Alert'}
        placement="right"
        width={420}
        open={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        extra={
          selectedAlert ? (
            <Button
              type="primary"
              onClick={() => {
                const href = notificationHref(selectedAlert);
                setSelectedAlert(null);
                router.push(href);
              }}
            >
              Open
            </Button>
          ) : null
        }
      >
        {selectedAlert ? (
          <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
            <Text type="secondary">{formatRelativeTime(selectedAlert.createdAt)}</Text>
            <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
              {selectedAlert.body}
            </Paragraph>
            <Space wrap>
              <Button
                type="primary"
                onClick={() => {
                  const href = notificationHref(selectedAlert);
                  setSelectedAlert(null);
                  router.push(href);
                }}
              >
                View related
              </Button>
              <Link href="/notifications" onClick={() => setSelectedAlert(null)}>
                <Button>Notification settings</Button>
              </Link>
            </Space>
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
}
