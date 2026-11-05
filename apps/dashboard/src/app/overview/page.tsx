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
  Flex,
  Modal,
  Row,
  Space,
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
import { EmptyState, PageHeader, SessionPreparing, StatusTag, colors, radii, spacing, typography } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { canCreateRestaurant, isHostRole, isPlatformAdmin, isQaRole, partnerLandingPath } from '@/lib/roles';
import {
  MARK_NOTIFICATIONS_READ,
  MY_NOTIFICATIONS,
  MY_OWNER_OVERVIEW,
  MY_RESTAURANTS_SHELL,
  MY_SUBSCRIPTION,
} from '@/lib/graphql';
import {
  type AppNotification,
  formatRelativeTime,
  notificationHref,
} from '@/lib/notificationLinks';
import { ADD_RESTAURANT_HREF, isInactiveRestaurant, restaurantHref } from '@/lib/restaurants';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';

const { Text, Paragraph } = Typography;

const ALERTS_PREVIEW_LIMIT = 3;
const ALERTS_FETCH_LIMIT = 20;

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
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);

  const isQa = Boolean(user && isQaRole(user.role));
  const overviewTodayLabel = useMemo(
    () => dayjs(todayIsoInTimeZone(PLATFORM_TIMEZONE)).format('MMM D, YYYY'),
    [],
  );
  const { data: restData } = useQuery(MY_RESTAURANTS_SHELL, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const restaurantsLoaded = restData !== undefined;
  const { activeRestaurantId, allRestaurants } = usePartnerRestaurant(restaurants);
  const { data: notifData, refetch: refetchNotifs } = useQuery(MY_NOTIFICATIONS, {
    skip: !user || !restaurantsLoaded,
    variables: {
      limit: ALERTS_FETCH_LIMIT,
      restaurantId: allRestaurants ? undefined : activeRestaurantId || undefined,
    },
  });
  const [markRead] = useMutation(MARK_NOTIFICATIONS_READ, {
    refetchQueries: ['MyNotifications', 'MyOwnerOverview'],
  });
  const { data: overviewData, loading: overviewLoading } = useQuery(MY_OWNER_OVERVIEW, {
    skip: !user || isQa || !restaurantsLoaded,
    fetchPolicy: 'cache-and-network',
    variables:
      allRestaurants || !activeRestaurantId ? {} : { restaurantId: activeRestaurantId },
  });
  const { data: subData } = useQuery(MY_SUBSCRIPTION, {
    skip: !user || !activeRestaurantId || allRestaurants,
    variables: { restaurantId: activeRestaurantId },
  });

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
    if (!authLoading && user && isPlatformAdmin(user.role)) router.replace('/admin');
    if (!authLoading && user && isQaRole(user.role)) router.replace('/admin/qa/dashboard');
    if (!authLoading && user && isHostRole(user.role)) {
      router.replace(partnerLandingPath(user.role));
    }
  }, [authLoading, user, router]);

  const overview = overviewData?.myOwnerOverview;
  const notifications: AppNotification[] = notifData?.myNotifications?.items ?? [];
  const previewNotifications = notifications.slice(0, ALERTS_PREVIEW_LIMIT);
  const hasMoreAlerts = notifications.length > ALERTS_PREVIEW_LIMIT;
  const subscription = subData?.mySubscription;
  const activeRestaurant = restaurants.find((r: { id: string }) => r.id === activeRestaurantId);
  const canAdd = Boolean(user && canCreateRestaurant(user.role));
  const locationsTotal = overview?.locationsTotal ?? 0;
  const locationRows: OwnerLocationRow[] = overview?.locations ?? [];
  const isMultiLocation = allRestaurants && locationsTotal > 1;
  const scopeHref = (path: string) =>
    !allRestaurants && activeRestaurantId && restaurants.length > 1
      ? restaurantHref(path, activeRestaurantId)
      : path;
  const visibleShortcuts = (
    allRestaurants ? shortcuts.filter((item) => item.href !== '/floor-ops' && item.href !== '/messages') : shortcuts
  ).map((item) => ({ ...item, href: scopeHref(item.href) }));

  const openLocation = (id: string, path: string) => {
    selectRestaurant(id);
    router.push(restaurantHref(path, id));
  };

  const openAlert = async (item: AppNotification) => {
    setAlertsModalOpen(false);
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

  const renderAlertItem = (item: AppNotification, index: number, items: AppNotification[]) => (
    <Flex
      key={item.id}
      align="center"
      gap={8}
      onClick={() => void openAlert(item)}
      style={{
        cursor: 'pointer',
        paddingBlock: 8,
        width: '100%',
        borderBottom:
          index < items.length - 1 ? `1px solid ${colors.bordersubtle}` : undefined,
      }}
    >
      <Space orientation="vertical" size={0} style={{ flex: 1, minWidth: 0 }}>
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
      <RightOutlined style={{ color: colors.neutral[400] }} />
    </Flex>
  );

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
        <Space orientation="vertical" size={spacing.sm} style={{ width: '100%' }}>
          {previewNotifications.map((item, index) =>
            renderAlertItem(item, index, previewNotifications),
          )}
          {hasMoreAlerts ? (
            <Button type="link" style={{ paddingInline: 0 }} onClick={() => setAlertsModalOpen(true)}>
              Show more
            </Button>
          ) : null}
        </Space>
      )}
    </Card>
  );

  if (authLoading || isQa || (user && overviewLoading && !overview)) {
    return <SessionPreparing variant="partner" />;
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
          title={allRestaurants ? 'All restaurants' : 'Overview'}
          subtitle={
            allRestaurants
              ? `Combined service snapshot for ${locationsTotal} restaurants on ${overviewTodayLabel}`
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
              href={scopeHref('/reservations')}
              title="Today's reservations"
              value={overview?.todayReservations ?? 0}
              prefix={<CalendarOutlined />}
            />
          </Col>
          <Col xs={12} md={8} lg={8}>
            <StatLinkCard
              href={scopeHref('/reservations')}
              title="Today's covers"
              value={overview?.todayCovers ?? 0}
              prefix={<TeamOutlined />}
            />
          </Col>
          <Col xs={12} md={8} lg={8}>
            <StatLinkCard
              href={scopeHref('/waitlist')}
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
            {allRestaurants ? (
              <Card style={{ height: '100%' }}>
                <Statistic
                  title="Avg rating"
                  value={overview?.averageRating ?? 0}
                  precision={1}
                  prefix={<StarOutlined />}
                  suffix={overview?.reviewCount ? `(${overview.reviewCount})` : undefined}
                />
              </Card>
            ) : (
              <StatLinkCard
                href={scopeHref('/reviews')}
                title="Avg rating"
                value={overview?.averageRating ?? 0}
                precision={1}
                prefix={<StarOutlined />}
                suffix={overview?.reviewCount ? `(${overview.reviewCount})` : undefined}
              />
            )}
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

          {allRestaurants ? (
            <Col xs={24} md={8}>
              <Card title="All restaurants selected" style={{ borderRadius: radii.lg, height: '100%' }}>
                <Space orientation="vertical" size={spacing.sm} style={{ width: '100%' }}>
                  <Text type="secondary">
                    These totals include every restaurant on the account. Choose one from the
                    header or from My restaurants before changing that restaurant.
                  </Text>
                  <Link href="/restaurants">
                    <Button type="primary" size="small">
                      My restaurants
                    </Button>
                  </Link>
                </Space>
              </Card>
            </Col>
          ) : (
            <Col xs={24} md={8}>
              <Card
                title={activeRestaurant ? activeRestaurant.name : 'Restaurant'}
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
                      <Text type="secondary">No subscription loaded for this restaurant.</Text>
                    )}
                    <Space wrap>
                      <Link href={scopeHref('/reservations')}>
                        <Button type="primary" size="small">
                          Reservations
                        </Button>
                      </Link>
                      <Link href={scopeHref('/billing')}>
                        <Button size="small">Billing</Button>
                      </Link>
                    </Space>
                  </Space>
                ) : (
                  <Text type="secondary">Select a restaurant from the header.</Text>
                )}
              </Card>
            </Col>
          )}

          <Col xs={24} md={8}>
            {alertsCard}
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="rt-stat-grid">
          {visibleShortcuts.map((item) => (
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

      <Modal
        title="Recent alerts"
        open={alertsModalOpen}
        onCancel={() => setAlertsModalOpen(false)}
        footer={null}
        width={480}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        {notifications.map((item, index) => renderAlertItem(item, index, notifications))}
      </Modal>

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
