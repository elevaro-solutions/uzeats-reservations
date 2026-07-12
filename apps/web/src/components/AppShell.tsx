'use client';

import Link from 'next/link';
import { Layout, Menu, Button, Space, Typography, Badge, Avatar } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { colors, layout, typography } from '@reservations/ui';
import { useAuth } from '@/lib/auth';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <Layout style={{ minHeight: '100vh', background: colors.background }}>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${colors.bordersubtle}`,
          paddingInline: 24,
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            aria-hidden
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: colors.brand[600],
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            R
          </span>
          <Text
            strong
            style={{
              fontSize: 19,
              color: colors.textPrimary,
              letterSpacing: typography.letterSpacing.tight,
            }}
          >
            Reserve<span style={{ color: colors.brand[600] }}>Table</span>
          </Text>
        </Link>
        <Menu
          mode="horizontal"
          selectedKeys={[pathname]}
          style={{ flex: 1, border: 'none', minWidth: 0, background: 'transparent' }}
          items={[
            { key: '/', label: <Link href="/">Find a table</Link> },
            { key: '/reservations', label: <Link href="/reservations">My reservations</Link> },
            { key: '/waitlist', label: <Link href="/waitlist">My waitlist</Link> },
            { key: '/pricing', label: <Link href="/pricing">For restaurants</Link> },
          ]}
        />
        <Space size={12}>
          {user ? (
            <>
              <Badge count={user.loyaltyPoints} overflowCount={9999} color={colors.brand[600]} offset={[-4, 4]}>
                <Button
                  type="text"
                  onClick={() => router.push('/profile')}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, paddingInline: 8 }}
                >
                  <Avatar
                    size={28}
                    style={{ background: colors.brand[50], color: colors.brand[600], fontWeight: 600 }}
                  >
                    {user.firstName?.[0]?.toUpperCase()}
                  </Avatar>
                  {user.firstName}
                </Button>
              </Badge>
              <Button onClick={logout}>Log out</Button>
            </>
          ) : (
            <>
              <Button type="text" onClick={() => router.push('/login')}>
                Sign in
              </Button>
              <Button type="primary" onClick={() => router.push('/register')}>
                Sign up
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
          textAlign: 'center',
          background: 'transparent',
          color: colors.textTertiary,
          fontSize: typography.fontSize.sm,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <Link href="/privacy" style={{ color: colors.textTertiary, marginRight: 16 }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: colors.textTertiary, marginRight: 16 }}>Terms of Service</Link>
          <Link href="/pricing" style={{ color: colors.textTertiary }}>For Restaurants</Link>
        </div>
        ReserveTable © {new Date().getFullYear()} — Find and book restaurants across the USA
      </Footer>
    </Layout>
  );
}
