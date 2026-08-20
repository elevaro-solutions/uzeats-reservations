'use client';

import Link from 'next/link';
import {
  Layout,
  Menu,
  Button,
  Space,
  Typography,
  Badge,
  Avatar,
  Dropdown,
  Drawer,
  List,
  Empty,
  Spin,
} from 'antd';
import type { MenuProps } from 'antd';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client/react';
import { Suspense, useEffect, useLayoutEffect, useState } from 'react';
import {
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CreditCardOutlined,
  LogoutOutlined,
  MenuOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { TableveraBrand, colors, layout, radii, typography } from '@reservations/ui';
import {
  COMPANY_ADDRESS_DISPLAY,
  COMPANY_PHONE,
  COMPANY_PHONE_DISPLAY,
  SUPPORT_EMAIL,
} from '@/lib/legal';
import { useAuth } from '@/lib/auth';
import {
  MARK_ALL_NOTIFICATIONS_READ,
  MARK_NOTIFICATIONS_READ,
  MY_NOTIFICATIONS,
} from '@/lib/graphql';
import { getDashboardUrl } from '@/lib/urls';
import { CookieConsent, openCookieSettings } from '@/components/CookieConsent';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

const AUTH_PATHS = ['/login', '/forgot-password', '/reset-password'];

type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: string | null;
  readAt?: string | null;
  createdAt: string;
};

function roleLabel(role: string) {
  if (role === 'diner') return 'Customer';
  return role.replace(/_/g, ' ');
}

function parseNotificationData(data: string | null | undefined): Record<string, unknown> {
  if (!data) return {};
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function reservationDetailHref(data: Record<string, unknown>): string {
  return typeof data.reservationId === 'string'
    ? `/reservations/${data.reservationId}`
    : '/reservations';
}

function availabilityAlertHref(data: Record<string, unknown>): string {
  const restaurantId = typeof data.restaurantId === 'string' ? data.restaurantId : null;
  const slug = typeof data.slug === 'string' ? data.slug : null;
  if (!restaurantId && !slug) return '/saved';

  const path = slug ? `/r/${slug}` : `/restaurants/${restaurantId}`;
  const params = new URLSearchParams();
  if (typeof data.slot === 'string') {
    const slotDate = new Date(data.slot);
    if (Number.isFinite(slotDate.getTime())) {
      params.set('date', slotDate.toISOString().slice(0, 10));
      params.set('slot', data.slot);
    }
  }
  if (typeof data.partySize === 'number' && data.partySize > 0) {
    params.set('party', String(data.partySize));
  } else if (typeof data.partySize === 'string' && data.partySize) {
    params.set('party', data.partySize);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function notificationHref(n: AppNotification): string {
  const data = parseNotificationData(n.data);

  switch (n.type) {
    case 'new_message':
      return typeof data.reservationId === 'string'
        ? `/messages/${data.reservationId}`
        : '/reservations';
    case 'reservation_confirmed':
    case 'reservation_reminder':
    case 'reservation_updates':
      return reservationDetailHref(data);
    case 'waitlist_available':
    case 'waitlist_ready':
    case 'waitlist_notified':
      return '/waitlist';
    case 'saved_restaurant_available':
      return availabilityAlertHref(data);
    case 'review_reply':
    case 'survey_invitation':
      return reservationDetailHref(data);
    default:
      return '/profile';
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

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppShellInner>{children}</AppShellInner>
    </Suspense>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Soft navigations can keep the previous page's scroll offset (e.g. for-restaurants → pricing).
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const {
    data: notifData,
    loading: notifLoading,
    refetch: refetchNotifs,
  } = useQuery(MY_NOTIFICATIONS, {
    skip: !user,
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

  const isAuthRoute = AUTH_PATHS.some((p) => pathname.startsWith(p));
  const isFullWidthPage =
    pathname === '/' ||
    pathname === '/for-restaurants' ||
    pathname.startsWith('/cities/') ||
    pathname.startsWith('/cuisine/') ||
    pathname.startsWith('/neighborhoods/') ||
    pathname.startsWith('/occasion/');
  const isRestaurantMarketing =
    pathname.startsWith('/for-restaurants') ||
    pathname.startsWith('/pricing') ||
    (pathname.startsWith('/contact') && searchParams.get('topic') === 'restaurant');
  const dashboardUrl = getDashboardUrl();
  const signInHref = isRestaurantMarketing ? `${dashboardUrl}/login` : '/login';
  const getStartedHref = isRestaurantMarketing ? '/pricing' : '/login';
  const getStartedLabel = isRestaurantMarketing ? 'Register restaurant' : 'Get started';
  const homeHref = isRestaurantMarketing ? '/for-restaurants' : '/';

  if (isAuthRoute) {
    return <>{children}</>;
  }

  const notifications: AppNotification[] =
    (notifData as { myNotifications?: AppNotification[] } | undefined)?.myNotifications ?? [];
  const unreadCount: number =
    (notifData as { unreadNotificationCount?: number } | undefined)?.unreadNotificationCount ?? 0;

  const dinerNavItems = [
    { key: '/', label: <Link href="/">Find a table</Link> },
    ...(user
      ? [
          { key: '/reservations', label: <Link href="/reservations">My reservations</Link> },
          { key: '/saved', label: <Link href="/saved">Saved</Link> },
          { key: '/waitlist', label: <Link href="/waitlist">Waitlist</Link> },
          { key: '/profile', label: <Link href="/profile">Profile</Link> },
        ]
      : [
          {
            key: '/for-restaurants',
            label: (
              <Link href="/for-restaurants" target="_blank" rel="noopener noreferrer">
                For restaurants
              </Link>
            ),
          },
        ]),
  ];

  const restaurantNavItems = [
    { key: '/for-restaurants', label: <Link href="/for-restaurants">For restaurants</Link> },
    { key: '/pricing', label: <Link href="/pricing">Pricing</Link> },
    {
      key: '/contact?topic=restaurant',
      label: <Link href="/contact?topic=restaurant">Contact sales</Link>,
    },
  ];

  const navItems = isRestaurantMarketing ? restaurantNavItems : dinerNavItems;

  const mobileNavLinks = isRestaurantMarketing
    ? [
        { href: '/for-restaurants', label: 'For restaurants' },
        { href: '/pricing', label: 'Pricing' },
        { href: '/contact?topic=restaurant', label: 'Contact sales' },
      ]
    : user
      ? [
          { href: '/', label: 'Find a table' },
          { href: '/reservations', label: 'My reservations' },
          { href: '/saved', label: 'Saved' },
          { href: '/waitlist', label: 'Waitlist' },
          { href: '/profile', label: 'Profile' },
          { href: '/blog', label: 'Blog' },
        ]
      : [
          { href: '/', label: 'Find a table' },
          { href: '/for-restaurants', label: 'For restaurants', newTab: true },
          { href: '/blog', label: 'Blog' },
        ];

  const selectedNavKey = (() => {
    if (isRestaurantMarketing) {
      if (pathname.startsWith('/pricing')) return '/pricing';
      if (pathname.startsWith('/contact')) return '/contact?topic=restaurant';
      return '/for-restaurants';
    }
    if (pathname === '/' || pathname.startsWith('/restaurants') || pathname.startsWith('/r/')) {
      return '/';
    }
    if (pathname.startsWith('/profile')) return '/profile';
    if (pathname.startsWith('/reservations')) return '/reservations';
    if (pathname.startsWith('/waitlist')) return '/waitlist';
    if (pathname.startsWith('/saved')) return '/saved';
    if (pathname.startsWith('/for-restaurants') || pathname.startsWith('/pricing')) {
      return '/for-restaurants';
    }
    return pathname;
  })();

  const accountMenu: MenuProps['items'] = user
    ? [
        {
          key: 'user',
          disabled: true,
          label: (
            <div style={{ lineHeight: 1.3, maxWidth: 220 }}>
              <Text strong style={{ display: 'block' }}>
                {user.firstName} {user.lastName}
              </Text>
              <Text type="secondary" style={{ fontSize: 12, textTransform: 'capitalize' }}>
                {roleLabel(user.role)}
              </Text>
            </div>
          ),
        },
        { type: 'divider' },
        {
          key: 'profile',
          icon: <UserOutlined />,
          label: 'Profile & loyalty',
          onClick: () => router.push('/profile'),
        },
        {
          key: 'notification-settings',
          icon: <BellOutlined />,
          label: 'Notification settings',
          onClick: () => router.push('/profile#notifications'),
        },
        {
          key: 'reservations',
          icon: <CalendarOutlined />,
          label: 'My reservations',
          onClick: () => router.push('/reservations'),
        },
        {
          key: 'saved',
          icon: <BookOutlined />,
          label: 'Saved restaurants',
          onClick: () => router.push('/saved'),
        },
        {
          key: 'waitlist',
          icon: <ClockCircleOutlined />,
          label: 'My waitlist',
          onClick: () => router.push('/waitlist'),
        },
        {
          key: 'billing',
          icon: <CreditCardOutlined />,
          label: 'Billing & invoices',
          onClick: () => router.push('/billing'),
        },
        { type: 'divider' },
        {
          key: 'logout',
          icon: <LogoutOutlined />,
          label: 'Log out',
          danger: true,
        },
      ]
    : [];

  const handleOpenNotification = async (n: AppNotification) => {
    if (!n.readAt) {
      try {
        await markRead({ variables: { ids: [n.id] } });
        await refetchNotifs();
      } catch {
        // continue navigation
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
            router.push('/profile#notifications');
          }}
        >
          Notification settings
        </Button>
      </div>
    </div>
  );

  return (
    <div component="AppShell" style={{ display: 'contents' }}><Layout style={{ minHeight: '100vh', background: colors.background }}>
      <Header
        className="rt-site-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          height: layout.headerHeight,
          lineHeight: `${layout.headerHeight}px`,
        }}
      >
        <Link
          href={homeHref}
          className="rt-site-header__brand"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}
          aria-label={isRestaurantMarketing ? 'Tablevera Partner Hub' : 'Tablevera'}
        >
          <TableveraBrand iconSize={34} surface="dark" />
          {isRestaurantMarketing ? <span className="rt-site-header__hub">Partner Hub</span> : null}
        </Link>

        <Menu
          mode="horizontal"
          theme="dark"
          selectedKeys={[selectedNavKey]}
          className="rt-site-header__nav"
          style={{ flex: 1, border: 'none', minWidth: 0, background: 'transparent' }}
          items={navItems}
        />

        <Space size={8} className="rt-site-header__actions">
          {authLoading ? (
            <div style={{ width: 120, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Spin size="small" />
            </div>
          ) : user && !isRestaurantMarketing ? (
            <>
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
                  className="rt-site-header__notify"
                  style={{
                    width: 40,
                    height: 40,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  icon={
                    <Badge
                      count={unreadCount}
                      size="small"
                      overflowCount={99}
                      offset={[2, -2]}
                      color={colors.accent[400]}
                    >
                      <BellOutlined style={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.88)' }} />
                    </Badge>
                  }
                />
              </Dropdown>

              <Dropdown
                menu={{
                  items: accountMenu,
                  onClick: ({ key }) => {
                    if (key === 'logout') {
                      void logout();
                      return;
                    }
                    if (key === 'profile') router.push('/profile');
                    if (key === 'notification-settings') router.push('/profile#notifications');
                    if (key === 'reservations') router.push('/reservations');
                    if (key === 'saved') router.push('/saved');
                    if (key === 'waitlist') router.push('/waitlist');
                    if (key === 'billing') router.push('/billing');
                  },
                }}
                placement="bottomRight"
                trigger={['click']}
              >
                <button
                  type="button"
                  aria-label="Account menu"
                  className="rt-site-header__account"
                >
                  <Avatar
                    size={32}
                    style={{
                      background: 'rgba(255, 255, 255, 0.14)',
                      color: '#fff',
                      fontWeight: 600,
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                    }}
                    icon={!user.firstName ? <UserOutlined /> : undefined}
                  >
                    {user.firstName?.[0]?.toUpperCase()}
                  </Avatar>
                  <div style={{ lineHeight: 1.25, textAlign: 'left' }} className="rt-header-user">
                    <Text strong className="rt-site-header__account-name" style={{ display: 'block', fontSize: typography.fontSize.sm }}>
                      {user.firstName}
                    </Text>
                    <Text
                      className="rt-site-header__account-role"
                      style={{ fontSize: typography.fontSize.xs, textTransform: 'capitalize' }}
                    >
                      {roleLabel(user.role)}
                    </Text>
                  </div>
                </button>
              </Dropdown>
            </>
          ) : (
            <Button type="text" className="rt-site-header__sign-in" href={signInHref}>
              Sign in
            </Button>
          )}

          {!user && (
            <Button
              type="primary"
              className="rt-site-header__cta"
              href={getStartedHref}
              style={{ borderRadius: radii.pill }}
            >
              <span className="rt-site-header__cta-full">{getStartedLabel}</span>
              <span className="rt-site-header__cta-short">
                {isRestaurantMarketing ? 'Register' : 'Get started'}
              </span>
            </Button>
          )}

          <Button
            type="text"
            className="rt-site-header__menu-btn"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((open) => !open)}
            icon={mobileNavOpen ? <CloseOutlined /> : <MenuOutlined />}
          />
        </Space>
      </Header>

      <Drawer
        placement="right"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        width={300}
        className="rt-site-header__drawer"
        styles={{
          body: { padding: '12px 16px 24px', background: colors.brand[600] },
          header: {
            background: colors.brand[600],
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          },
        }}
        title={
          <Text strong style={{ color: '#fff' }}>
            Menu
          </Text>
        }
        closeIcon={<CloseOutlined style={{ color: 'rgba(255, 255, 255, 0.85)' }} />}
      >
        <nav className="rt-mobile-nav" aria-label="Mobile">
          {mobileNavLinks.map((item) => {
            const newTab = 'newTab' in item && item.newTab;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rt-mobile-nav__link${selectedNavKey === item.href ? ' is-active' : ''}`}
                onClick={() => setMobileNavOpen(false)}
                {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {!user && (
          <div className="rt-mobile-nav__actions">
            <Button block href={signInHref} className="rt-mobile-nav__sign-in">
              Sign in
            </Button>
            <Button block type="primary" href={getStartedHref} className="rt-mobile-nav__cta">
              {getStartedLabel}
            </Button>
          </div>
        )}
      </Drawer>

      <Content
        style={{
          maxWidth: isFullWidthPage ? '100%' : layout.contentMaxWidth,
          width: '100%',
          margin: '0 auto',
          padding: isFullWidthPage ? '0' : '32px 24px',
        }}
      >
        {children}
      </Content>

      <Footer
        className="rt-site-footer"
        style={{
          background: `linear-gradient(180deg, ${colors.brand[600]} 0%, ${colors.heroMid} 100%)`,
        }}
      >
        <div className="rt-site-footer__inner">
          <div className="rt-site-footer__brand">
            <Link
              href={homeHref}
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}
              aria-label={isRestaurantMarketing ? 'Tablevera Partner Hub' : 'Tablevera'}
            >
              <TableveraBrand iconSize={38} surface="dark" />
              {isRestaurantMarketing ? <span className="rt-site-header__hub">Partner Hub</span> : null}
            </Link>
            <p className="rt-site-footer__tagline">
              Discover. Reserve. Dine.
            </p>
            <p className="rt-site-footer__desc">
              Book the best tables in seconds — free for diners, built for restaurants.
            </p>
            <div className="rt-site-footer__contact">
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              <a href={`tel:${COMPANY_PHONE}`}>{COMPANY_PHONE_DISPLAY}</a>
              <span>{COMPANY_ADDRESS_DISPLAY}</span>
            </div>
          </div>

          <div className="rt-site-footer__links">
            <div>
              <div className="rt-site-footer__heading">Product</div>
              <div className="rt-site-footer__list">
                {isRestaurantMarketing ? (
                  <>
                    <Link href="/for-restaurants">For restaurants</Link>
                    <Link href="/pricing">Pricing</Link>
                    <Link href="/contact?topic=restaurant">Contact sales</Link>
                    <a href={signInHref}>Partner sign in</a>
                  </>
                ) : (
                  <>
                    <Link href="/">Find a table</Link>
                    {user ? (
                      <>
                        <Link href="/reservations">My reservations</Link>
                        <Link href="/waitlist">Waitlist</Link>
                        <Link href="/profile">Profile</Link>
                      </>
                    ) : (
                      <>
                        <Link href="/for-restaurants" target="_blank" rel="noopener noreferrer">
                          For restaurants
                        </Link>
                        <Link href="/pricing">Pricing</Link>
                        <a href={signInHref}>Sign in</a>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            <div>
              <div className="rt-site-footer__heading">Explore</div>
              <div className="rt-site-footer__list">
                <Link href="/cities">Cities</Link>
                <Link href="/cuisine">Cuisines</Link>
                <Link href="/occasion">Occasions</Link>
                <Link href="/neighborhoods">Neighborhoods</Link>
                <Link href="/cities/new-york-ny">New York</Link>
                <Link href="/cuisine/italian">Italian</Link>
              </div>
            </div>
            <div>
              <div className="rt-site-footer__heading">Company</div>
              <div className="rt-site-footer__list">
                <Link href="/blog">Blog</Link>
                <Link href="/contact">Contact</Link>
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
                <Link href="/sms">SMS terms</Link>
                <Link href="/cookies">Cookies</Link>
                <button type="button" className="rt-site-footer__cookie-btn" onClick={openCookieSettings}>
                  Cookie settings
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rt-site-footer__bottom">
          © {new Date().getFullYear()} Tablevera. All rights reserved.
        </div>
      </Footer>

      <CookieConsent />
    </Layout></div>
  );
}
