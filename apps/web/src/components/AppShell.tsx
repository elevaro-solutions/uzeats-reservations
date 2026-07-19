'use client';

import Link from 'next/link';
import { Layout, Menu, Button, Space, Typography, Badge, Avatar, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarOutlined,
  LogoutOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { colors, layout, radii, typography } from '@reservations/ui';
import { useAuth } from '@/lib/auth';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

const AUTH_PATHS = ['/login', '/forgot-password', '/reset-password'];

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
      R
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isAuthRoute = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isAuthRoute) {
    return <>{children}</>;
  }

  const navItems = [
    { key: '/', label: <Link href="/">Find a table</Link> },
    ...(user
      ? [
          { key: '/reservations', label: <Link href="/reservations">My reservations</Link> },
          { key: '/waitlist', label: <Link href="/waitlist">Waitlist</Link> },
        ]
      : []),
    { key: '/pricing', label: <Link href="/pricing">For restaurants</Link> },
  ];

  const accountMenu: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile & loyalty',
      onClick: () => router.push('/profile'),
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
      onClick: logout,
    },
  ];

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
            Reserve<span style={{ color: colors.brand[600] }}>Table</span>
          </Text>
        </Link>

        <Menu
          mode="horizontal"
          selectedKeys={[pathname === '/' ? '/' : pathname]}
          style={{ flex: 1, border: 'none', minWidth: 0, background: 'transparent' }}
          items={navItems}
        />

        <Space size={10}>
          {user ? (
            <Dropdown menu={{ items: accountMenu }} placement="bottomRight" trigger={['click']}>
              <button
                type="button"
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
                  transition: layout.transition,
                }}
              >
                <Badge
                  count={user.loyaltyPoints}
                  overflowCount={9999}
                  color={colors.brand[600]}
                  offset={[-2, 2]}
                  size="small"
                >
                  <Avatar
                    size={32}
                    style={{
                      background: colors.brand[50],
                      color: colors.brand[700],
                      fontWeight: 600,
                      border: `1.5px solid ${colors.brand[100]}`,
                    }}
                  >
                    {user.firstName?.[0]?.toUpperCase()}
                  </Avatar>
                </Badge>
                <Text
                  strong
                  className="rt-header-name"
                  style={{
                    fontSize: typography.fontSize.sm,
                    paddingRight: 4,
                  }}
                >
                  {user.firstName}
                </Text>
              </button>
            </Dropdown>
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
                ReserveTable
              </Text>
            </Link>
            <p style={{ margin: '14px 0 0', fontSize: 13, lineHeight: 1.6 }}>
              Book the best tables in seconds — free for diners, built for restaurants.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                Product
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <Link href="/" style={{ color: 'rgba(255,255,255,0.55)' }}>Find a table</Link>
                <Link href="/pricing" style={{ color: 'rgba(255,255,255,0.55)' }}>For restaurants</Link>
                {user && (
                  <Link href="/reservations" style={{ color: 'rgba(255,255,255,0.55)' }}>My reservations</Link>
                )}
              </div>
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                Legal
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.55)' }}>Privacy</Link>
                <Link href="/terms" style={{ color: 'rgba(255,255,255,0.55)' }}>Terms</Link>
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
          © {new Date().getFullYear()} ReserveTable. All rights reserved.
        </div>
      </Footer>

    </Layout>
  );
}
