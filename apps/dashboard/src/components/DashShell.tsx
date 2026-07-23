'use client';

import Link from 'next/link';
import {
  Layout,
  Menu,
  Button,
  Typography,
  Avatar,
  Select,
  Dropdown,
  Badge,
  List,
  Empty,
  Spin,
  Alert,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  AppstoreOutlined,
  BarChartOutlined,
  CalendarOutlined,
  DollarOutlined,
  SettingOutlined,
  TableOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
  TeamOutlined,
  AuditOutlined,
  LogoutOutlined,
  ContactsOutlined,
  MessageOutlined,
  MailOutlined,
  StarOutlined,
  FileTextOutlined,
  LayoutOutlined,
  RocketOutlined,
  GiftOutlined,
  ShopOutlined,
  BellOutlined,
  UserOutlined,
  CheckOutlined,
  FileDoneOutlined,
  FundOutlined,
  ControlOutlined,
  TagOutlined,
  TrophyOutlined,
  CustomerServiceOutlined,
  WarningOutlined,
  FlagOutlined,
  DownloadOutlined,
  DashboardOutlined,
  CompassOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useEffect, useMemo, useState } from 'react';
import { TableveraWordmark, colors, radii, spacing, typography } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
  MARK_ALL_NOTIFICATIONS_READ,
  MARK_NOTIFICATIONS_READ,
  MY_NOTIFICATIONS,
  MY_RESTAURANTS,
} from '@/lib/graphql';
import {
  MANY_LOCATIONS_THRESHOLD,
  restaurantSelectFilterOption,
} from '@/lib/restaurants';
import { getOnboardingProgress, getOnboardingSteps } from '@/lib/onboarding';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

type NavChild = {
  key: string;
  icon: React.ReactNode;
  label: React.ReactNode;
};

type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: string | null;
  readAt?: string | null;
  createdAt: string;
};

function navLink(href: string, label: string) {
  return <Link href={href}>{label}</Link>;
}

function item(key: string, icon: React.ReactNode, label: string): NavChild {
  return { key, icon, label: navLink(key, label) };
}

const SETTINGS_PREFIXES = [
  '/settings',
  '/edit',
  '/menu',
  '/blackouts',
  '/access-rules',
  '/surveys',
  '/groups',
  '/integrations',
  '/notifications',
];

function notificationHref(n: AppNotification): string {
  let data: Record<string, unknown> = {};
  try {
    data = n.data ? JSON.parse(n.data) : {};
  } catch {
    data = {};
  }

  switch (n.type) {
    case 'new_message':
      return typeof data.reservationId === 'string'
        ? `/messages?reservationId=${data.reservationId}`
        : '/messages';
    case 'new_reservation':
    case 'reservation_confirmed':
    case 'reservation_reminder':
      return '/reservations';
    case 'waitlist_available':
    case 'waitlist_ready':
    case 'waitlist_notified':
      return '/waitlist';
    case 'guest_spend_alert':
      return data.reservationId ? '/reservations' : '/guests';
    case 'review_reply':
      return '/reviews';
    default:
      return '/notifications';
  }
}

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

import { getPublicWebUrl } from '@/lib/webUrl';

const PARTNER_ROLES = new Set(['restaurant_owner', 'staff', 'admin']);

export function DashShell({ children }: { children: React.ReactNode }) {
  const { user, logout, loading: authLoading, isImpersonating, impersonator, endImpersonation } =
    useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user?.role === 'admin' && !isImpersonating;
  const isPartner =
    Boolean(user) && (PARTNER_ROLES.has(user!.role) || isImpersonating);
  const [restaurantId, setRestaurantId] = useState<string>();
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: restaurantsData } = useQuery(MY_RESTAURANTS, {
    skip: !user || isAdmin || !isPartner,
  });
  const {
    data: notifData,
    loading: notifLoading,
    refetch: refetchNotifs,
  } = useQuery(MY_NOTIFICATIONS, {
    skip: !user || (user.role === 'diner' && !isImpersonating),
    variables: { limit: 20 },
    pollInterval: 60_000,
  });
  const [markRead] = useMutation(MARK_NOTIFICATIONS_READ);
  const [markAllRead, { loading: markingAll }] = useMutation(MARK_ALL_NOTIFICATIONS_READ);

  // Diners belong on the customer web app — never show Partner Hub chrome to them.
  useEffect(() => {
    if (authLoading || !user) return;
    if (user.role === 'diner' && !isImpersonating) {
      logout();
      window.location.href = `${getPublicWebUrl()}/login?next=/`;
    }
  }, [user, authLoading, isImpersonating, logout]);

  useEffect(() => {
    if (!user || !isPartner) return;
    if (user.role === 'admin' && !isImpersonating) return;
    const saved = localStorage.getItem('activeRestaurantId');
    const list = restaurantsData?.myRestaurants ?? [];
    const valid = list.some((r: { id: string }) => r.id === saved);
    setRestaurantId(valid ? saved! : list[0]?.id);
  }, [user, restaurantsData, isPartner, isImpersonating]);

  useEffect(() => {
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) setRestaurantId(id);
    };
    window.addEventListener('rt-restaurant-change', onChange);
    return () => window.removeEventListener('rt-restaurant-change', onChange);
  }, []);

  const selectedKey = useMemo(() => {
    if (pathname.startsWith('/admin')) {
      if (pathname === '/admin' || pathname === '/admin/') return '/admin';
      return pathname;
    }
    if (SETTINGS_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return '/settings';
    }
    const exact = [
      '/',
      '/onboarding',
      '/reservations',
      '/waitlist',
      '/floor-plan',
      '/floor',
      '/guests',
      '/loyalty',
      '/messages',
      '/reviews',
      '/marketing',
      '/booking-widget',
      '/campaigns',
      '/experiences',
      '/private-dining',
      '/analytics',
      '/reports',
      '/billing',
      '/settings',
    ];
    if (exact.includes(pathname)) return pathname;
    return pathname;
  }, [pathname]);

  if (!user || (user.role === 'diner' && !isImpersonating)) {
    return <>{children}</>;
  }

  const restaurants = restaurantsData?.myRestaurants ?? [];
  const notifications: AppNotification[] = notifData?.myNotifications ?? [];
  const unreadCount: number = notifData?.unreadNotificationCount ?? 0;
  const activeRestaurant = restaurants.find((r: { id: string }) => r.id === restaurantId);
  const onboardingSteps = activeRestaurant ? getOnboardingSteps(activeRestaurant) : [];
  const onboardingProgress = getOnboardingProgress(onboardingSteps);
  const showOnboardingBanner =
    !isAdmin &&
    isPartner &&
    activeRestaurant &&
    onboardingProgress.showOnboarding &&
    pathname !== '/onboarding';

  const partnerItems = [
    {
      type: 'group' as const,
      label: 'Service',
      children: [
        item('/', <AppstoreOutlined />, 'Overview'),
        item('/reservations', <CalendarOutlined />, 'Reservations'),
        item('/waitlist', <ClockCircleOutlined />, 'Waitlist'),
        item('/floor-plan', <LayoutOutlined />, 'Floor plan'),
        item('/floor', <TableOutlined />, 'Tables & shifts'),
      ],
    },
    {
      type: 'group' as const,
      label: 'Guests',
      children: [
        item('/guests', <ContactsOutlined />, 'Guests'),
        item('/loyalty', <TrophyOutlined />, 'Loyalty'),
        item('/messages', <MessageOutlined />, 'Messages'),
        item('/reviews', <StarOutlined />, 'Reviews'),
      ],
    },
    {
      type: 'group' as const,
      label: 'Grow',
      children: [
        item('/marketing', <RocketOutlined />, 'Marketing'),
        item('/booking-widget', <CodeOutlined />, 'Booking widget'),
        item('/campaigns', <MailOutlined />, 'Campaigns'),
        item('/experiences', <GiftOutlined />, 'Experiences'),
        item('/private-dining', <TeamOutlined />, 'Private dining'),
      ],
    },
    {
      type: 'group' as const,
      label: 'Insights',
      children: [
        item('/analytics', <BarChartOutlined />, 'Analytics'),
        item('/reports', <FileTextOutlined />, 'Reports'),
      ],
    },
    {
      type: 'group' as const,
      label: 'Account',
      children: [
        ...(onboardingProgress.showOnboarding
          ? [item('/onboarding', <CompassOutlined />, 'Get started')]
          : []),
        item('/settings', <SettingOutlined />, 'Settings'),
        item('/billing', <DollarOutlined />, 'Billing'),
      ],
    },
  ];

  const adminItems = [
    {
      type: 'group' as const,
      label: 'Support',
      children: [
        item('/admin', <SafetyOutlined />, 'Overview'),
        item('/admin/users', <TeamOutlined />, 'Users & access'),
        item('/admin/restaurants', <ShopOutlined />, 'Restaurants'),
        item('/admin/support', <CustomerServiceOutlined />, 'Tickets'),
        item('/admin/moderation', <FlagOutlined />, 'Moderation'),
      ],
    },
    {
      type: 'group' as const,
      label: 'Billing',
      children: [
        item('/admin/invoices', <FileDoneOutlined />, 'Invoices'),
        item('/admin/revenue', <FundOutlined />, 'Revenue'),
        item('/admin/loyalty', <TrophyOutlined />, 'Loyalty'),
        item('/admin/churn', <WarningOutlined />, 'Churn alerts'),
        item('/admin/pricing', <TagOutlined />, 'Plans & pricing'),
        item('/admin/exports', <DownloadOutlined />, 'CSV exports'),
      ],
    },
    {
      type: 'group' as const,
      label: 'Platform',
      children: [
        item('/admin/config', <ControlOutlined />, 'Configuration'),
        item('/admin/templates', <MailOutlined />, 'Email templates'),
        item('/admin/sla', <DashboardOutlined />, 'SLA metrics'),
        item('/admin/audit', <AuditOutlined />, 'Audit logs'),
      ],
    },
  ];

  const items = isAdmin ? adminItems : partnerItems;

  const profileMenu: MenuProps['items'] = [
    {
      key: 'user',
      disabled: true,
      label: (
        <div style={{ lineHeight: 1.3, maxWidth: 220 }}>
          <Text strong style={{ display: 'block' }}>
            {user.firstName} {user.lastName}
          </Text>
          <Text type="secondary" style={{ fontSize: 12, textTransform: 'capitalize' }}>
            {user.role.replace(/_/g, ' ')}
          </Text>
        </div>
      ),
    },
    { type: 'divider' },
    ...(isAdmin
      ? [
          {
            key: 'admin-config',
            icon: <ControlOutlined />,
            label: 'Platform config',
            onClick: () => router.push('/admin/config'),
          },
        ]
      : [
          {
            key: 'settings',
            icon: <SettingOutlined />,
            label: 'Settings',
            onClick: () => router.push('/settings'),
          },
          {
            key: 'notification-settings',
            icon: <BellOutlined />,
            label: 'Notification settings',
            onClick: () => router.push('/notifications'),
          },
        ]),
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Log out',
      danger: true,
      onClick: () => {
        logout();
        router.push('/login');
      },
    },
  ];

  const handleOpenNotification = async (n: AppNotification) => {
    if (!n.readAt) {
      try {
        await markRead({ variables: { ids: [n.id] } });
        await refetchNotifs();
      } catch {
        // navigation still proceeds
      }
    }
    setNotifOpen(false);
    router.push(notificationHref(n));
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      await refetchNotifs();
    } catch {
      // ignore
    }
  };

  const notificationDropdown = (
    <div
      style={{
        width: 360,
        maxWidth: '92vw',
        background: colors.surface,
        borderRadius: radii.lg,
        border: `1px solid ${colors.border}`,
        boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderBottom: `1px solid ${colors.bordersubtle}`,
        }}
      >
        <Text strong>Notifications</Text>
        <Button
          type="link"
          size="small"
          icon={<CheckOutlined />}
          disabled={!unreadCount}
          loading={markingAll}
          onClick={handleMarkAllRead}
          style={{ paddingInline: 0 }}
        >
          Mark all read
        </Button>
      </div>
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {notifLoading ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Spin size="small" />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No notifications yet"
            style={{ padding: '28px 16px' }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(n) => {
              const unread = !n.readAt;
              return (
                <List.Item
                  key={n.id}
                  onClick={() => handleOpenNotification(n)}
                  style={{
                    cursor: 'pointer',
                    padding: '12px 14px',
                    background: unread ? colors.brand[50] : colors.surface,
                    borderBottom: `1px solid ${colors.bordersubtle}`,
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge dot={unread} color={colors.brand[600]}>
                        <Avatar
                          size={36}
                          style={{
                            background: unread ? colors.brand[100] : colors.bordersubtle,
                            color: colors.brand[700],
                          }}
                          icon={<BellOutlined />}
                        />
                      </Badge>
                    }
                    title={
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                          alignItems: 'baseline',
                        }}
                      >
                        <Text strong={unread} style={{ fontSize: 13 }}>
                          {n.title}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                          {formatRelativeTime(n.createdAt)}
                        </Text>
                      </div>
                    }
                    description={
                      <Text
                        type="secondary"
                        style={{
                          fontSize: 12,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {n.body}
                      </Text>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </div>
      <div
        style={{
          padding: '10px 14px',
          borderTop: `1px solid ${colors.bordersubtle}`,
          textAlign: 'center',
        }}
      >
        <Button
          type="link"
          size="small"
          onClick={() => {
            setNotifOpen(false);
            router.push('/notifications');
          }}
        >
          Notification settings
        </Button>
      </div>
    </div>
  );

  return (
    <div component="DashShell" style={{ display: 'contents' }}><Layout style={{ minHeight: '100vh', background: colors.background }}>
      {isImpersonating && impersonator && (
        <Alert
          type="warning"
          banner
          showIcon
          message={
            <span>
              Viewing as <strong>{user.firstName} {user.lastName}</strong> ({user.role.replace(/_/g, ' ')})
              — signed in as admin {impersonator.firstName} {impersonator.lastName}
            </span>
          }
          action={
            <Button size="small" type="primary" onClick={() => endImpersonation()}>
              Exit impersonation
            </Button>
          }
        />
      )}
      <Layout>
      <Sider
        theme="light"
        width={248}
        className="rt-dash-sider"
        style={{
          borderRight: `1px solid ${colors.bordersubtle}`,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'auto',
          background: colors.surface,
        }}
      >
        <div
          style={{
            padding: '20px 16px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            borderBottom: `1px solid ${colors.bordersubtle}`,
            marginBottom: 4,
          }}
        >
          <TableveraWordmark iconSize={28} />
          {/* <Text
            type="secondary"
            style={{
              display: 'block',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: typography.letterSpacing.wide,
              fontWeight: 600,
            }}
          >
            {isAdmin ? 'Platform Admin' : 'Partner Hub'}
          </Text> */}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={items}
          style={{ border: 'none', paddingBlock: 8, background: 'transparent' }}
        />
      </Sider>
      <Layout style={{ background: colors.background }}>
        <Header
          style={{
            background: colors.surface,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: spacing.md,
            borderBottom: `1px solid ${colors.bordersubtle}`,
            paddingInline: spacing.lg,
            position: 'sticky',
            top: 0,
            zIndex: 100,
            height: 64,
            lineHeight: '64px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {isAdmin ? (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Help diners & restaurants · manage billing & platform settings
              </Text>
            ) : (
              <>
                <ShopOutlined style={{ color: colors.textTertiary, fontSize: 16 }} />
                <Select
                  placeholder="Select restaurant"
                  style={{ width: 260, maxWidth: '100%' }}
                  value={restaurantId}
                  onChange={(id) => {
                    setRestaurantId(id);
                    localStorage.setItem('activeRestaurantId', id);
                    window.dispatchEvent(new CustomEvent('rt-restaurant-change', { detail: id }));
                  }}
                  options={restaurants.map((r: { id: string; name: string }) => ({
                    value: r.id,
                    label: r.name,
                  }))}
                  showSearch={restaurants.length >= MANY_LOCATIONS_THRESHOLD}
                  filterOption={restaurantSelectFilterOption}
                  variant="borderless"
                  popupMatchSelectWidth={280}
                />
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Dropdown
              trigger={['click']}
              open={notifOpen}
              onOpenChange={(open) => {
                setNotifOpen(open);
                if (open) refetchNotifs();
              }}
              popupRender={() => notificationDropdown}
              placement="bottomRight"
            >
              <Button
                type="text"
                aria-label="Notifications"
                style={{
                  width: 40,
                  height: 40,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.textSecondary,
                }}
                icon={
                  <Badge count={unreadCount} size="small" overflowCount={99} offset={[2, -2]}>
                    <BellOutlined style={{ fontSize: 18 }} />
                  </Badge>
                }
              />
            </Dropdown>

            <Dropdown menu={{ items: profileMenu }} placement="bottomRight" trigger={['click']}>
              <button
                type="button"
                aria-label="Account menu"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '4px 10px 4px 4px',
                  borderRadius: radii.pill,
                  border: `1px solid ${colors.border}`,
                  background: colors.surface,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  height: 42,
                }}
              >
                <Avatar
                  size={32}
                  style={{
                    background: colors.brand[50],
                    color: colors.brand[600],
                    fontWeight: 600,
                    border: `1px solid ${colors.brand[100]}`,
                  }}
                  icon={!user.firstName ? <UserOutlined /> : undefined}
                >
                  {user.firstName?.[0]?.toUpperCase()}
                </Avatar>
                <div style={{ lineHeight: 1.25, textAlign: 'left' }} className="rt-header-user">
                  <Text strong style={{ display: 'block', fontSize: typography.fontSize.sm }}>
                    {user.firstName}
                  </Text>
                  <Text
                    type="secondary"
                    style={{ fontSize: typography.fontSize.xs, textTransform: 'capitalize' }}
                  >
                    {user.role.replace(/_/g, ' ')}
                  </Text>
                </div>
              </button>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px`,
            maxWidth: 1200,
            width: '100%',
            margin: '0 auto',
          }}
        >
          {showOnboardingBanner && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: spacing.lg, borderRadius: radii.lg }}
              message="Finish setting up your restaurant"
              description={
                <span>
                  {onboardingProgress.completedRequired} of {onboardingProgress.totalRequired}{' '}
                  required steps complete for {activeRestaurant?.name}. Complete your profile, tables
                  & shifts, and await approval to start taking reservations.
                </span>
              }
              action={
                <Button size="small" type="primary" onClick={() => router.push('/onboarding')}>
                  Continue setup
                </Button>
              }
            />
          )}
          {children}
        </Content>
      </Layout>
      </Layout>
    </Layout></div>
  );
}
