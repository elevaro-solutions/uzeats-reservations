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
  message,
  Drawer,
  Tooltip,
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
  IdcardOutlined,
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
  ToolOutlined,
  EyeOutlined,
  BookOutlined,
  MenuOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useEffect, useMemo, useState } from 'react';
import { buildRestaurantBookingUrl } from '@reservations/shared';
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
  buildRestaurantSelectOptions,
  restaurantSelectFilterOption,
  validatedRestaurantId,
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

function parseNotificationData(data: string | null | undefined): Record<string, unknown> {
  if (!data) return {};
  try {
    const parsed = JSON.parse(data) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function asNotificationId(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function withRestaurantParam(path: string, data: Record<string, unknown>): string {
  const restaurantId = asNotificationId(data.restaurantId);
  if (!restaurantId) return path;
  const url = new URL(path, 'http://dashboard.local');
  url.searchParams.set('restaurant', restaurantId);
  return `${url.pathname}${url.search}`;
}

function reservationManageHref(data: Record<string, unknown>): string {
  const reservationId = asNotificationId(data.reservationId);
  const restaurantId = asNotificationId(data.restaurantId);
  if (reservationId) {
    return restaurantId
      ? `/reservations/${reservationId}?restaurant=${encodeURIComponent(restaurantId)}`
      : `/reservations/${reservationId}`;
  }
  if (restaurantId) return `/reservations?restaurant=${encodeURIComponent(restaurantId)}`;
  return '/reservations';
}

function notificationHref(n: AppNotification): string {
  const data = parseNotificationData(n.data);
  const reservationId = asNotificationId(data.reservationId);

  switch (n.type) {
    case 'new_message':
      return withRestaurantParam(
        reservationId ? `/messages?reservationId=${encodeURIComponent(reservationId)}` : '/messages',
        data,
      );
    case 'restaurant_inquiry':
      return withRestaurantParam(
        asNotificationId(data.inquiryId)
          ? `/messages?inquiryId=${encodeURIComponent(asNotificationId(data.inquiryId)!)}`
          : '/messages',
        data,
      );
    case 'new_reservation':
    case 'reservation_confirmed':
    case 'reservation_reminder':
    case 'reservation_cancelled':
    case 'reservation_updated':
      return reservationManageHref(data);
    case 'waitlist_available':
    case 'waitlist_ready':
    case 'waitlist_notified':
      return withRestaurantParam('/waitlist', data);
    case 'guest_spend_alert':
      return reservationId ? reservationManageHref(data) : withRestaurantParam('/guests', data);
    case 'review_reply':
      return withRestaurantParam('/reviews', data);
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
import { isPlatformAdmin, isSuperAdmin } from '@/lib/roles';

const PARTNER_ROLES = new Set(['restaurant_owner', 'staff', 'admin', 'super_admin']);

export function DashShell({ children }: { children: React.ReactNode }) {
  const { user, logout, loading: authLoading, isImpersonating, impersonator, endImpersonation } =
    useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = user ? isPlatformAdmin(user.role) && !isImpersonating : false;
  const isSuperAdminUser = user ? isSuperAdmin(user.role) && !isImpersonating : false;
  const isPartner =
    Boolean(user) && (PARTNER_ROLES.has(user!.role) || isImpersonating);
  const [restaurantId, setRestaurantId] = useState<string>();
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { data: restaurantsData, refetch: refetchRestaurants } = useQuery(MY_RESTAURANTS, {
    skip: !user || isAdmin || !isPartner,
    fetchPolicy: 'cache-and-network',
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
  const [markRead] = useMutation(MARK_NOTIFICATIONS_READ, {
    refetchQueries: [{ query: MY_NOTIFICATIONS, variables: { limit: 20 } }],
  });
  const [markAllRead, { loading: markingAll }] = useMutation(MARK_ALL_NOTIFICATIONS_READ, {
    refetchQueries: [{ query: MY_NOTIFICATIONS, variables: { limit: 20 } }],
    awaitRefetchQueries: true,
  });

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
    if (isPlatformAdmin(user.role) && !isImpersonating) return;
    const saved = localStorage.getItem('activeRestaurantId');
    const list = restaurantsData?.myRestaurants ?? [];
    const fromUrl = searchParams.get('restaurant');
    const validFromUrl = fromUrl && list.some((r: { id: string }) => r.id === fromUrl) ? fromUrl : undefined;
    const valid = list.some((r: { id: string }) => r.id === saved);
    const next = validFromUrl ?? (valid ? saved! : list[0]?.id);
    setRestaurantId(next);
  }, [user, restaurantsData, isPartner, isImpersonating, searchParams]);

  useEffect(() => {
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) setRestaurantId(id);
    };
    window.addEventListener('rt-restaurant-change', onChange);
    return () => window.removeEventListener('rt-restaurant-change', onChange);
  }, []);

  useEffect(() => {
    if (!user || !isPartner) return;
    const onFocus = () => {
      void refetchRestaurants();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, isPartner, refetchRestaurants]);

  useEffect(() => {
    setMobileNavOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  const selectedKey = useMemo(() => {
    if (pathname.startsWith('/admin')) {
      if (pathname === '/admin' || pathname === '/admin/') return '/admin';
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length >= 2) return `/${segments[0]}/${segments[1]}`;
      return pathname;
    }
    if (SETTINGS_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return '/settings';
    }
    if (pathname === '/reservations' || pathname.startsWith('/reservations/')) {
      return '/reservations';
    }
    const exact = [
      '/',
      '/restaurants',
      '/onboarding',
      '/reservations',
      '/waitlist',
      '/floor-ops',
      '/floor-plan',
      '/floor',
      '/guests',
      '/loyalty',
      '/messages',
      '/reviews',
      '/marketing',
      '/profile',
      '/booking-widget',
      '/campaigns',
      '/experiences',
      '/packages',
      '/private-dining',
      '/analytics',
      '/reports',
      '/billing',
      '/settings',
    ];
    if (exact.includes(pathname)) return pathname;
    return pathname;
  }, [pathname]);

  const restaurants = restaurantsData?.myRestaurants ?? [];
  const restaurantIds = restaurants.map((r: { id: string }) => r.id);
  const activeRestaurantId = validatedRestaurantId(restaurantId, restaurantIds);
  const activeRestaurant = restaurants.find((r: { id: string }) => r.id === activeRestaurantId);
  const dinerPageUrl = useMemo(() => {
    if (!activeRestaurant) return null;
    if ((activeRestaurant as { status?: string }).status !== 'approved') return null;
    return buildRestaurantBookingUrl(getPublicWebUrl(), {
      slug: (activeRestaurant as { slug?: string | null }).slug,
      id: activeRestaurant.id,
    });
  }, [activeRestaurant]);
  const dinerPreviewBlocked =
    Boolean(activeRestaurant) &&
    (activeRestaurant as { status?: string }).status !== 'approved';

  if (!user || (user.role === 'diner' && !isImpersonating)) {
    return <>{children}</>;
  }

  const restaurantSelectOptions = buildRestaurantSelectOptions(restaurants);
  const notifications: AppNotification[] = notifData?.myNotifications?.items ?? [];
  const unreadCount: number = notifData?.unreadNotificationCount ?? 0;
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
        item('/', <DashboardOutlined />, 'Overview'),
        item('/restaurants', <ShopOutlined />, 'My restaurants'),
        item('/reservations', <CalendarOutlined />, 'Reservations'),
        item('/waitlist', <ClockCircleOutlined />, 'Waitlist'),
        item('/floor-ops', <AppstoreOutlined />, 'Floor ops'),
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
        item('/profile', <ShopOutlined />, 'Public profile'),
        item('/booking-widget', <CodeOutlined />, 'Booking widget'),
        item('/campaigns', <MailOutlined />, 'Campaigns'),
        item('/experiences', <GiftOutlined />, 'Experiences'),
        item('/packages', <ShopOutlined />, 'Packages'),
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
      label: 'Accounts',
      children: [
        item('/admin/diners', <UserOutlined />, 'Diners'),
        item('/admin/owners', <IdcardOutlined />, 'Restaurant owners'),
        item('/admin/staff', <TeamOutlined />, 'Staff'),
        item('/admin/users', <SafetyOutlined />, 'Platform users'),
      ],
    },
    {
      type: 'group' as const,
      label: 'Support',
      children: [
        item('/admin', <SafetyOutlined />, 'Overview'),
        item('/admin/restaurants', <ShopOutlined />, 'Restaurants'),
        item('/admin/slug-requests', <LinkOutlined />, 'URL slugs'),
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
        item('/admin/services', <AppstoreOutlined />, 'Services'),
        item('/admin/exports', <DownloadOutlined />, 'CSV exports'),
      ],
    },
    {
      type: 'group' as const,
      label: 'Platform',
      children: [
        item('/admin/config', <ControlOutlined />, 'Configuration'),
        item('/admin/discovery', <CompassOutlined />, 'Discovery'),
        item('/admin/blog', <FileTextOutlined />, 'Blog'),
        item('/admin/docs-access', <BookOutlined />, 'Docs access'),
        item('/admin/templates', <MailOutlined />, 'Email templates'),
        item('/admin/sla', <DashboardOutlined />, 'SLA metrics'),
        item('/admin/audit', <AuditOutlined />, 'Audit logs'),
        ...(isSuperAdminUser
          ? [item('/admin/developer', <ToolOutlined />, 'Developer')]
          : []),
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
          {
            key: 'billing',
            icon: <DollarOutlined />,
            label: 'Billing',
            onClick: () => router.push('/billing'),
          },
        ]),
    ...(isAdmin
      ? [
          {
            key: 'invoices',
            icon: <FileDoneOutlined />,
            label: 'Invoices',
            onClick: () => router.push('/admin/invoices'),
          },
        ]
      : []),
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Log out',
      danger: true,
    },
  ];

  const handleOpenNotification = async (n: AppNotification) => {
    const href = notificationHref(n);
    setNotifOpen(false);
    router.push(href);
    if (!n.readAt) {
      try {
        await markRead({ variables: { ids: [n.id] } });
        await refetchNotifs();
      } catch {
        // already navigated
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      await refetchNotifs();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to mark notifications as read');
    }
  };

  const notificationDropdown = (
    <div className="rt-notif-dropdown">
      <div className="rt-notif-dropdown__header">
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
      <div className="rt-notif-dropdown__body">
        {notifLoading ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Spin size="small" />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No notifications yet"
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(n) => {
              const unread = !n.readAt;
              return (
                <List.Item
                  key={n.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    void handleOpenNotification(n);
                  }}
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
      <div className="rt-notif-dropdown__footer">
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
    <div component="DashShell" style={{ display: 'contents' }}><Layout hasSider={false} style={{ minHeight: '100vh', background: colors.background }}>
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
      <Layout hasSider>
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
        <div className="rt-dash-sider__brand">
          <TableveraWordmark iconSize={28} />
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={items}
          style={{ border: 'none', paddingBlock: 8, background: 'transparent' }}
        />
      </Sider>
      <Layout className="rt-dash-main" style={{ background: colors.background, minWidth: 0 }}>
        <Header className="rt-dash-header">
          <div className="rt-dash-header__start">
            <Button
              type="text"
              className="rt-dash-menu-btn"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
              icon={<MenuOutlined />}
            />
            {isAdmin ? (
              <Text type="secondary" className="rt-dash-header__tagline">
                Help diners & restaurants · manage billing & platform settings
              </Text>
            ) : (
              <>
                <ShopOutlined className="rt-dash-header__shop-icon" />
                <Select
                  placeholder="Select restaurant"
                  className="rt-dash-restaurant-select"
                  value={activeRestaurantId}
                  onChange={(id) => {
                    setRestaurantId(id);
                    localStorage.setItem('activeRestaurantId', id);
                    window.dispatchEvent(new CustomEvent('rt-restaurant-change', { detail: id }));
                    const params = new URLSearchParams(searchParams.toString());
                    if (restaurants.length > 1) params.set('restaurant', id);
                    else params.delete('restaurant');
                    const qs = params.toString();
                    const nextUrl = qs ? `${pathname}?${qs}` : pathname;
                    router.replace(nextUrl, { scroll: false });
                  }}
                  options={restaurantSelectOptions}
                  showSearch={restaurants.length >= MANY_LOCATIONS_THRESHOLD}
                  filterOption={restaurantSelectFilterOption}
                  variant="borderless"
                  popupMatchSelectWidth={320}
                />
                {dinerPageUrl && (
                  <Button
                    type="default"
                    size="small"
                    className="rt-dash-view-diner"
                    icon={<EyeOutlined />}
                    href={dinerPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="rt-dash-view-diner-label">View as diner</span>
                  </Button>
                )}
                {dinerPreviewBlocked && (
                  <Tooltip title="Publish this restaurant (status: approved) before viewing the public diner page.">
                    <Button
                      type="default"
                      size="small"
                      className="rt-dash-view-diner"
                      icon={<EyeOutlined />}
                      disabled
                    >
                      <span className="rt-dash-view-diner-label">View as diner</span>
                    </Button>
                  </Tooltip>
                )}
              </>
            )}
          </div>
          <div className="rt-dash-header__end">
            <Dropdown
              trigger={['click']}
              open={notifOpen}
              onOpenChange={(open) => {
                setNotifOpen(open);
                if (open) refetchNotifs();
              }}
              popupRender={() => notificationDropdown}
              placement="bottomRight"
              getPopupContainer={() => document.body}
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

            <Dropdown
              menu={{
                items: profileMenu,
                onClick: ({ key }) => {
                  if (key === 'logout') {
                    void logout();
                    return;
                  }
                  if (key === 'settings') router.push('/settings');
                  if (key === 'notification-settings') router.push('/notifications');
                  if (key === 'billing') router.push('/billing');
                  if (key === 'invoices') router.push('/admin/invoices');
                  if (key === 'admin-config') router.push('/admin/config');
                },
              }}
              placement="bottomRight"
              trigger={['click']}
              getPopupContainer={() => document.body}
            >
              <button
                type="button"
                aria-label="Account menu"
                className="rt-dash-account"
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
          className={
            pathname === '/notifications' ? 'rt-dash-content rt-dash-content--fill' : 'rt-dash-content'
          }
        >
          {showOnboardingBanner && (
            <Alert
              type="info"
              showIcon
              className="rt-onboarding-alert"
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
    </Layout>
      <Drawer
        placement="left"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        size={280}
        zIndex={1200}
        getContainer={() => document.body}
        className="rt-dash-nav-drawer"
        styles={{ body: { padding: 0 } }}
        title={<TableveraWordmark iconSize={26} />}
      >
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={items}
          onClick={() => setMobileNavOpen(false)}
          style={{ border: 'none', paddingBlock: 8, background: 'transparent' }}
        />
      </Drawer>
    </div>
  );
}
