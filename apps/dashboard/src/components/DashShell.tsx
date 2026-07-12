'use client';

import Link from 'next/link';
import { Layout, Menu, Button, Typography, Avatar } from 'antd';
import {
  AppstoreOutlined,
  BarChartOutlined,
  CalendarOutlined,
  DollarOutlined,
  EditOutlined,
  StopOutlined,
  TableOutlined,
  ReadOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
  TeamOutlined,
  AuditOutlined,
  LogoutOutlined,
  ContactsOutlined,
  MessageOutlined,
  MailOutlined,
  StarOutlined,
  FormOutlined,
  FileTextOutlined,
  LayoutOutlined,
  LockOutlined,
  ApiOutlined,
  RocketOutlined,
  GiftOutlined,
  ClusterOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import { colors, typography } from '@reservations/ui';
import { useAuth } from '@/lib/auth';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export function DashShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';

  if (!user) {
    return <>{children}</>;
  }

  const items = [
    { key: '/', icon: <AppstoreOutlined />, label: <Link href="/">Overview</Link> },
    {
      key: '/reservations',
      icon: <CalendarOutlined />,
      label: <Link href="/reservations">Reservations</Link>,
    },
    { key: '/floor', icon: <TableOutlined />, label: <Link href="/floor">Tables & shifts</Link> },
    {
      key: '/floor-plan',
      icon: <LayoutOutlined />,
      label: <Link href="/floor-plan">Floor plan</Link>,
    },
    { key: '/menu', icon: <ReadOutlined />, label: <Link href="/menu">Menu</Link> },
    {
      key: '/waitlist',
      icon: <ClockCircleOutlined />,
      label: <Link href="/waitlist">Waitlist</Link>,
    },
    { key: '/edit', icon: <EditOutlined />, label: <Link href="/edit">Edit</Link> },
    { key: '/blackouts', icon: <StopOutlined />, label: <Link href="/blackouts">Blackouts</Link> },
    {
      key: '/access-rules',
      icon: <LockOutlined />,
      label: <Link href="/access-rules">Access rules</Link>,
    },
    { type: 'divider' as const },
    { key: '/guests', icon: <ContactsOutlined />, label: <Link href="/guests">Guests</Link> },
    {
      key: '/messages',
      icon: <MessageOutlined />,
      label: <Link href="/messages">Messages</Link>,
    },
    { key: '/reviews', icon: <StarOutlined />, label: <Link href="/reviews">Reviews</Link> },
    {
      key: '/campaigns',
      icon: <MailOutlined />,
      label: <Link href="/campaigns">Campaigns</Link>,
    },
    { key: '/surveys', icon: <FormOutlined />, label: <Link href="/surveys">Surveys</Link> },
    {
      key: '/marketing',
      icon: <RocketOutlined />,
      label: <Link href="/marketing">Marketing</Link>,
    },
    {
      key: '/experiences',
      icon: <GiftOutlined />,
      label: <Link href="/experiences">Experiences</Link>,
    },
    {
      key: '/private-dining',
      icon: <TeamOutlined />,
      label: <Link href="/private-dining">Private dining</Link>,
    },
    { type: 'divider' as const },
    {
      key: '/analytics',
      icon: <BarChartOutlined />,
      label: <Link href="/analytics">Analytics</Link>,
    },
    { key: '/reports', icon: <FileTextOutlined />, label: <Link href="/reports">Reports</Link> },
    { key: '/groups', icon: <ClusterOutlined />, label: <Link href="/groups">Groups</Link> },
    {
      key: '/integrations',
      icon: <ApiOutlined />,
      label: <Link href="/integrations">Integrations</Link>,
    },
    {
      key: '/billing',
      icon: <DollarOutlined />,
      label: <Link href="/billing">Billing</Link>,
    },
    ...(isAdmin
      ? [
          { type: 'divider' as const },
          { key: '/admin', icon: <SafetyOutlined />, label: <Link href="/admin">Admin</Link> },
          {
            key: '/admin/users',
            icon: <TeamOutlined />,
            label: <Link href="/admin/users">Users</Link>,
          },
          {
            key: '/admin/audit',
            icon: <AuditOutlined />,
            label: <Link href="/admin/audit">Audit Logs</Link>,
          },
        ]
      : []),
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="light"
        width={232}
        style={{
          borderRight: `1px solid ${colors.bordersubtle}`,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <div style={{ padding: '20px 16px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            aria-hidden
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: colors.brand[600],
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            R
          </span>
          <div style={{ lineHeight: 1.2 }}>
            <Text strong style={{ fontSize: 15, letterSpacing: typography.letterSpacing.tight }}>
              ReserveTable
            </Text>
            <Text
              type="secondary"
              style={{
                display: 'block',
                fontSize: typography.fontSize.xs,
                textTransform: 'uppercase',
                letterSpacing: typography.letterSpacing.wide,
              }}
            >
              Partner Hub
            </Text>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={items}
          style={{ border: 'none', paddingInline: 8 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: colors.surface,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 16,
            borderBottom: `1px solid ${colors.bordersubtle}`,
            paddingInline: 24,
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar
              size={30}
              style={{ background: colors.brand[50], color: colors.brand[600], fontWeight: 600 }}
            >
              {user.firstName?.[0]?.toUpperCase()}
            </Avatar>
            <div style={{ lineHeight: 1.25 }}>
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
          <Button
            icon={<LogoutOutlined />}
            onClick={() => {
              logout();
              router.push('/login');
            }}
          >
            Log out
          </Button>
        </Header>
        <Content style={{ padding: 24, maxWidth: 1280, width: '100%', margin: '0 auto' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
