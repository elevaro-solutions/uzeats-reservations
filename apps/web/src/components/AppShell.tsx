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
  List,
  Empty,
  Spin,
} from 'antd';
import type { MenuProps } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client/react';
import { useState } from 'react';
import {
  BellOutlined,
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { colors, layout, radii, typography } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
  MARK_ALL_NOTIFICATIONS_READ,
  MARK_NOTIFICATIONS_READ,
  MY_NOTIFICATIONS,
} from '@/lib/graphql';

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

function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        background: `linear-gradient(145deg, ${colors.brand[500]} 0%, ${colors.brand[700]} 100%)`,
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.48),
        fontWeight: 700,
        letterSpacing: '-0.02em',
        boxShadow: `0 2px 8px rgba(196, 71, 47, 0.35)`,
        flexShrink: 0,
      }}
    >
      T
    </span>
  );
}

function roleLabel(role: string) {
  if (role === 'diner') return 'Customer';
  return role.replace(/_/g, ' ');
}

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
        ? `/messages/${data.reservationId}`
        : '/reservations';
    case 'reservation_confirmed':
    case 'reservation_reminder':
    case 'reservation_updates':
      return '/reservations';
    case 'waitlist_available':
    case 'waitlist_ready':
    case 'waitlist_notified':
      return '/waitlist';
    case 'review_reply':
    case 'survey_invitation':
      return '/reservations';
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
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);

  const {
    data: notifData,
    loading: notifLoading,
    refetch: refetchNotifs,
  } = useQuery(MY_NOTIFICATIONS, {
    skip: !user,
    variables: { limit: 20 },
    pollInterval: 60_000,
  });
  const [markRead] = useMutation(MARK_NOTIFICATIONS_READ);
  const [markAllRead, { loading: markingAll }] = useMutation(MARK_ALL_NOTIFICATIONS_READ);

  const isAuthRoute = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isAuthRoute) {
    return <>{children}</>;
  }

  const notifications: AppNotification[] =
    (notifData as { myNotifications?: AppNotification[] } | undefined)?.myNotifications ?? [];
  const unreadCount: number =
    (notifData as { unreadNotificationCount?: number } | undefined)?.unreadNotificationCount ?? 0;

  // Diner app: only customer booking surfaces (no partner/admin links when signed in).
  const navItems = [
    { key: '/', label: <Link href="/">Find a table</Link> },
    ...(user
      ? [
          { key: '/reservations', label: <Link href="/reservations">My reservations</Link> },
          { key: '/waitlist', label: <Link href="/waitlist">Waitlist</Link> },
          { key: '/profile', label: <Link href="/profile">Profile</Link> },
        ]
      : [{ key: '/pricing', label: <Link href="/pricing">For restaurants</Link> }]),
  ];

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
          key: 'waitlist',
          icon: <ClockCircleOutlined />,
          label: 'My waitlist',
          onClick: () => router.push('/waitlist'),
        },
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
    <Layout style={{ minHeight: '100vh', background: colors.background }}>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          height: layout.headerHeight,
          lineHeight: `${layout.headerHeight}px`,
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${colors.bordersubtle}`,
          paddingInline: 24,
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandMark />
          <Text
            strong
            style={{
              fontSize: 18,
              color: colors.textPrimary,
              letterSpacing: typography.letterSpacing.tight,
              fontWeight: typography.fontWeight.bold,
            }}
          >
            Table<span style={{ color: colors.brand[600] }}>vera</span>
          </Text>
        </Link>

        <Menu
          mode="horizontal"
          selectedKeys={[
            pathname === '/' || pathname.startsWith('/restaurants')
              ? '/'
              : pathname.startsWith('/profile')
                ? '/profile'
                : pathname.startsWith('/reservations')
                  ? '/reservations'
                  : pathname.startsWith('/waitlist')
                    ? '/waitlist'
                    : pathname,
          ]}
          style={{ flex: 1, border: 'none', minWidth: 0, background: 'transparent' }}
          items={navItems}
        />

        <Space size={8}>
          {user ? (
            <>
              <Dropdown
                trigger={['click']}
                open={notifOpen}
                onOpenChange={(open) => {
                  setNotifOpen(open);
                  if (open) refetchNotifs();
                }}
                dropdownRender={() => notificationDropdown}
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

              <Dropdown menu={{ items: accountMenu }} placement="bottomRight" trigger={['click']}>
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
                    transition: layout.transition,
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
                      {roleLabel(user.role)}
                    </Text>
                  </div>
                </button>
              </Dropdown>
            </>
          ) : (
            <>
              <Button type="text" onClick={() => router.push('/login')} style={{ fontWeight: 500 }}>
                Sign in
              </Button>
              <Button
                type="primary"
                onClick={() => router.push('/login')}
                style={{ borderRadius: radii.pill, fontWeight: 600, paddingInline: 18 }}
              >
                Get started
              </Button>
            </>
          )}
        </Space>
      </Header>

      <Content
        style={{
          maxWidth: layout.contentMaxWidth,
          width: '100%',
          margin: '0 auto',
          padding: '32px 24px',
        }}
      >
        {children}
      </Content>

      <Footer
        style={{
          background: colors.neutral[900],
          color: 'rgba(255,255,255,0.55)',
          padding: '48px 24px 32px',
          marginTop: 48,
        }}
      >
        <div
          style={{
            maxWidth: layout.contentMaxWidth,
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 32,
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ maxWidth: 320 }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <BrandMark size={28} />
              <Text strong style={{ color: '#fff', fontSize: 17 }}>
                Tablevera
              </Text>
            </Link>
            <p style={{ margin: '14px 0 0', fontSize: 13, lineHeight: 1.6 }}>
              Book the best tables in seconds — free for diners, built for restaurants.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            <div>
              <div
                style={{
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 12,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                Product
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <Link href="/" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Find a table
                </Link>
                {user ? (
                  <>
                    <Link href="/reservations" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      My reservations
                    </Link>
                    <Link href="/waitlist" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      Waitlist
                    </Link>
                    <Link href="/profile" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      Profile
                    </Link>
                  </>
                ) : (
                  <Link href="/pricing" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    For restaurants
                  </Link>
                )}
              </div>
            </div>
            <div>
              <div
                style={{
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 12,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                Legal
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Privacy
                </Link>
                <Link href="/terms" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Terms
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            maxWidth: layout.contentMaxWidth,
            margin: '36px auto 0',
            paddingTop: 20,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          © {new Date().getFullYear()} Tablevera. All rights reserved.
        </div>
      </Footer>
    </Layout>
  );
}
