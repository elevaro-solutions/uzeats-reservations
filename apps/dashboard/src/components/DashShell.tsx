'use client';

import Link from 'next/link';
import { Layout, Menu, Button, Typography, Avatar, Select, Tooltip } from 'antd';
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
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { useEffect, useMemo, useState } from 'react';
import { colors, radii, spacing, typography } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { MY_RESTAURANTS } from '@/lib/graphql';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

type NavChild = {
  key: string;
  icon: React.ReactNode;
  label: React.ReactNode;
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
];

export function DashShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';
  const [restaurantId, setRestaurantId] = useState<string>();
  const { data: restaurantsData } = useQuery(MY_RESTAURANTS, { skip: !user });

  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem('activeRestaurantId');
    const list = restaurantsData?.myRestaurants ?? [];
    const valid = list.some((r: { id: string }) => r.id === saved);
    setRestaurantId(valid ? saved! : list[0]?.id);
  }, [user, restaurantsData]);

  useEffect(() => {
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) setRestaurantId(id);
    };
    window.addEventListener('rt-restaurant-change', onChange);
    return () => window.removeEventListener('rt-restaurant-change', onChange);
  }, []);

  const selectedKey = useMemo(() => {
    if (SETTINGS_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return '/settings';
    }
    if (pathname.startsWith('/admin')) return pathname;
    const exact = [
      '/',
      '/reservations',
      '/waitlist',
      '/floor-plan',
      '/floor',
      '/guests',
      '/messages',
      '/reviews',
      '/marketing',
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

  if (!user) {
    return <>{children}</>;
  }

  const restaurants = restaurantsData?.myRestaurants ?? [];

  const items = [
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
        item('/messages', <MessageOutlined />, 'Messages'),
        item('/reviews', <StarOutlined />, 'Reviews'),
      ],
    },
    {
      type: 'group' as const,
      label: 'Grow',
      children: [
        item('/marketing', <RocketOutlined />, 'Marketing'),
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
        item('/settings', <SettingOutlined />, 'Settings'),
        item('/billing', <DollarOutlined />, 'Billing'),
      ],
    },
    ...(isAdmin
      ? [
          {
            type: 'group' as const,
            label: 'Platform',
            children: [
              item('/admin', <SafetyOutlined />, 'Admin'),
              item('/admin/users', <TeamOutlined />, 'Users'),
              item('/admin/audit', <AuditOutlined />, 'Audit logs'),
            ],
          },
        ]
      : []),
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: colors.background }}>
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
            alignItems: 'center',
            gap: 10,
            borderBottom: `1px solid ${colors.bordersubtle}`,
            marginBottom: 4,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 32,
              height: 32,
              borderRadius: radii.sm,
              background: colors.brand[600],
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(196, 71, 47, 0.28)',
              flexShrink: 0,
            }}
          >
            R
          </span>
          <div style={{ lineHeight: 1.2, minWidth: 0 }}>
            <Text
              strong
              style={{
                fontSize: 15,
                letterSpacing: typography.letterSpacing.tight,
                display: 'block',
              }}
            >
              ReserveTable
            </Text>
            <Text
              type="secondary"
              style={{
                display: 'block',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: typography.letterSpacing.wide,
                fontWeight: 600,
              }}
            >
              Partner Hub
            </Text>
          </div>
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
              variant="borderless"
              popupMatchSelectWidth={280}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar
                size={34}
                style={{
                  background: colors.brand[50],
                  color: colors.brand[600],
                  fontWeight: 600,
                  border: `1px solid ${colors.brand[100]}`,
                }}
              >
                {user.firstName?.[0]?.toUpperCase()}
              </Avatar>
              <div style={{ lineHeight: 1.25 }} className="rt-header-user">
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
            </div>
            <Tooltip title="Log out">
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                style={{ color: colors.textSecondary }}
              >
                Log out
              </Button>
            </Tooltip>
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
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
