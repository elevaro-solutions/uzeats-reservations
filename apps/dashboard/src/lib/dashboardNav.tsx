'use client';

import type { ReactNode } from 'react';
import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  CompassOutlined,
  ContactsOutlined,
  ControlOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  DollarOutlined,
  DownloadOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  FlagOutlined,
  FundOutlined,
  GiftOutlined,
  IdcardOutlined,
  LayoutOutlined,
  LinkOutlined,
  MailOutlined,
  MessageOutlined,
  RocketOutlined,
  SafetyOutlined,
  SettingOutlined,
  ShopOutlined,
  StarOutlined,
  TableOutlined,
  TagOutlined,
  TeamOutlined,
  ToolOutlined,
  TrophyOutlined,
  UserOutlined,
  WarningOutlined,
  ApiOutlined,
  BellOutlined,
  ClusterOutlined,
  FormOutlined,
  LockOutlined,
  ReadOutlined,
  StopOutlined,
} from '@ant-design/icons';

export type DashboardAudience = 'partner' | 'admin';

export type DashboardPage = {
  href: string;
  label: string;
  group: string;
  audience: DashboardAudience;
  icon: ReactNode;
  /** Extra terms matched by page search (lowercase-friendly). */
  keywords?: string[];
  /** Soft gate — caller decides whether to include. */
  when?: 'onboarding' | 'super_admin';
};

function page(
  href: string,
  label: string,
  group: string,
  audience: DashboardAudience,
  icon: ReactNode,
  keywords?: string[],
  when?: 'onboarding' | 'super_admin',
): DashboardPage {
  return { href, label, group, audience, icon, keywords, when };
}

/** Partner Hub pages (sidebar + search). Settings tools that are not top-level sider entries are listed too. */
export const PARTNER_PAGES: DashboardPage[] = [
  page('/', 'Overview', 'Service', 'partner', <DashboardOutlined />, ['home', 'dashboard']),
  page('/restaurants', 'My restaurants', 'Service', 'partner', <ShopOutlined />, [
    'locations',
    'venues',
  ]),
  page('/reservations', 'Reservations', 'Service', 'partner', <CalendarOutlined />, [
    'bookings',
    'covers',
  ]),
  page('/waitlist', 'Waitlist', 'Service', 'partner', <ClockCircleOutlined />, ['queue']),
  page('/floor-ops', 'Live floor', 'Service', 'partner', <AppstoreOutlined />, [
    'floor ops',
    'service',
    'host',
    'seating',
  ]),
  page('/floor-plan', 'Table layout', 'Service', 'partner', <LayoutOutlined />, [
    'floor plan',
    'layout',
    'canvas',
    'map',
  ]),
  page('/floor', 'Tables & shifts', 'Service', 'partner', <TableOutlined />, [
    'areas',
    'capacity',
    'schedule',
  ]),
  page('/guests', 'Guests', 'Guests', 'partner', <ContactsOutlined />, ['crm', 'diners', 'vip']),
  page('/loyalty', 'Loyalty', 'Guests', 'partner', <TrophyOutlined />, ['points', 'rewards']),
  page('/messages', 'Messages', 'Guests', 'partner', <MessageOutlined />, ['inbox', 'chat']),
  page('/reviews', 'Reviews', 'Guests', 'partner', <StarOutlined />, ['ratings', 'feedback']),
  page('/marketing', 'Marketing', 'Grow', 'partner', <RocketOutlined />, [
    'featured',
    'promotion',
  ]),
  page('/profile', 'Public profile', 'Grow', 'partner', <ShopOutlined />, [
    'listing',
    'photos',
    'faq',
  ]),
  page('/booking-widget', 'Booking widget', 'Grow', 'partner', <CodeOutlined />, [
    'embed',
    'button',
    'widget',
  ]),
  page('/campaigns', 'Campaigns', 'Grow', 'partner', <MailOutlined />, ['email', 'newsletter']),
  page('/experiences', 'Experiences', 'Grow', 'partner', <GiftOutlined />, ['events', 'tickets']),
  page('/packages', 'Packages', 'Grow', 'partner', <ShopOutlined />, ['offers', 'deals']),
  page('/private-dining', 'Private dining', 'Grow', 'partner', <TeamOutlined />, [
    'events',
    'rooms',
  ]),
  page('/analytics', 'Analytics', 'Insights', 'partner', <BarChartOutlined />, [
    'stats',
    'metrics',
  ]),
  page('/reports', 'Reports', 'Insights', 'partner', <FileTextOutlined />, ['export', 'csv']),
  page(
    '/onboarding',
    'Get started',
    'Account',
    'partner',
    <CompassOutlined />,
    ['setup', 'checklist'],
    'onboarding',
  ),
  page('/settings', 'Settings', 'Account', 'partner', <SettingOutlined />, [
    'configuration',
    'preferences',
  ]),
  page('/billing', 'Billing', 'Account', 'partner', <DollarOutlined />, [
    'subscription',
    'plan',
    'invoice',
  ]),
  // Settings tools (reachable from Settings hub; included in search)
  page('/menu', 'Menu', 'Settings', 'partner', <ReadOutlined />, [
    'dishes',
    'food',
    'dietary',
  ]),
  page('/blackouts', 'Blackouts', 'Settings', 'partner', <StopOutlined />, [
    'closed',
    'holidays',
    'block',
  ]),
  page('/access-rules', 'Access rules', 'Settings', 'partner', <LockOutlined />, [
    'party size',
    'lead time',
    'limits',
  ]),
  page('/surveys', 'Surveys', 'Settings', 'partner', <FormOutlined />, [
    'feedback',
    'questions',
  ]),
  page('/groups', 'Groups', 'Settings', 'partner', <ClusterOutlined />, [
    'multi-location',
    'chain',
  ]),
  page('/integrations', 'Integrations', 'Settings', 'partner', <ApiOutlined />, [
    'api',
    'pos',
    'keys',
  ]),
  page('/notifications', 'Notifications', 'Settings', 'partner', <BellOutlined />, [
    'alerts',
    'email',
    'sms',
  ]),
];

/** Platform admin pages (sidebar + search). */
export const ADMIN_PAGES: DashboardPage[] = [
  page('/admin/diners', 'Diners', 'Accounts', 'admin', <UserOutlined />, ['customers', 'guests']),
  page('/admin/owners', 'Restaurant owners', 'Accounts', 'admin', <IdcardOutlined />, [
    'partners',
  ]),
  page('/admin/staff', 'Staff', 'Accounts', 'admin', <TeamOutlined />, ['employees']),
  page('/admin/users', 'Platform users', 'Accounts', 'admin', <SafetyOutlined />, [
    'admins',
    'accounts',
  ]),
  page('/admin', 'Overview', 'Support', 'admin', <SafetyOutlined />, ['home', 'dashboard']),
  page('/admin/restaurants', 'Restaurants', 'Support', 'admin', <ShopOutlined />, [
    'venues',
    'locations',
  ]),
  page('/admin/reservations', 'Reservations', 'Support', 'admin', <CalendarOutlined />, [
    'bookings',
  ]),
  page('/admin/slug-requests', 'URL slugs', 'Support', 'admin', <LinkOutlined />, [
    'vanity',
    'url',
  ]),
  page('/admin/profile-requests', 'Profile requests', 'Support', 'admin', <ShopOutlined />, [
    'listing',
    'changes',
  ]),
  page('/admin/support', 'Tickets', 'Support', 'admin', <CustomerServiceOutlined />, [
    'help',
    'support',
  ]),
  page('/admin/moderation', 'Moderation', 'Support', 'admin', <FlagOutlined />, [
    'reports',
    'abuse',
  ]),
  page('/admin/invoices', 'Invoices', 'Billing', 'admin', <FileDoneOutlined />, ['billing']),
  page('/admin/revenue', 'Revenue', 'Billing', 'admin', <FundOutlined />, ['mrr', 'income']),
  page('/admin/loyalty', 'Loyalty', 'Billing', 'admin', <TrophyOutlined />, ['points']),
  page('/admin/churn', 'Churn alerts', 'Billing', 'admin', <WarningOutlined />, [
    'retention',
    'cancel',
  ]),
  page('/admin/pricing', 'Plans & pricing', 'Billing', 'admin', <TagOutlined />, [
    'packages',
    'subscription',
  ]),
  page('/admin/services', 'Services', 'Billing', 'admin', <AppstoreOutlined />, [
    'addons',
    'products',
  ]),
  page('/admin/exports', 'CSV exports', 'Billing', 'admin', <DownloadOutlined />, ['download']),
  page('/admin/config', 'Configuration', 'Platform', 'admin', <ControlOutlined />, [
    'settings',
    'env',
  ]),
  page('/admin/discovery', 'Discovery', 'Platform', 'admin', <CompassOutlined />, [
    'images',
    'stock',
  ]),
  page('/admin/blog', 'Blog', 'Platform', 'admin', <FileTextOutlined />, ['posts', 'cms']),
  page('/admin/docs-access', 'Docs access', 'Platform', 'admin', <BookOutlined />, [
    'documentation',
  ]),
  page('/admin/templates', 'Email templates', 'Platform', 'admin', <MailOutlined />, [
    'transactional',
  ]),
  page('/admin/sla', 'SLA metrics', 'Platform', 'admin', <DashboardOutlined />, [
    'uptime',
    'performance',
  ]),
  page('/admin/audit', 'Audit logs', 'Platform', 'admin', <AuditOutlined />, [
    'history',
    'activity',
  ]),
  page(
    '/admin/developer',
    'Developer',
    'Platform',
    'admin',
    <ToolOutlined />,
    ['debug', 'tools'],
    'super_admin',
  ),
];

export type SearchablePage = DashboardPage & {
  /** Optional restaurant switch target shown in partner search. */
  kind?: 'page' | 'restaurant';
  description?: string;
};

export function filterPagesForUser(
  pages: DashboardPage[],
  opts: { showOnboarding?: boolean; isSuperAdmin?: boolean },
): DashboardPage[] {
  return pages.filter((p) => {
    if (p.when === 'onboarding') return Boolean(opts.showOnboarding);
    if (p.when === 'super_admin') return Boolean(opts.isSuperAdmin);
    return true;
  });
}

export function matchPages(pages: SearchablePage[], query: string): SearchablePage[] {
  const q = query.trim().toLowerCase();
  if (!q) return pages;

  const tokens = q.split(/\s+/).filter(Boolean);
  return pages
    .map((page) => {
      const haystack = [
        page.label,
        page.group,
        page.href,
        page.description ?? '',
        ...(page.keywords ?? []),
      ]
        .join(' ')
        .toLowerCase();
      const score = tokens.reduce((acc, token) => {
        if (!haystack.includes(token)) return -1;
        let next = acc + 1;
        if (page.label.toLowerCase().startsWith(token)) next += 3;
        else if (page.label.toLowerCase().includes(token)) next += 2;
        if (page.group.toLowerCase() === token) next += 1;
        return next;
      }, 0);
      return { page, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.page.label.localeCompare(b.page.label))
    .map((row) => row.page);
}

/** Sidebar groups only — settings tools stay out of the sider. */
const PARTNER_SIDER_HREFS = new Set(
  PARTNER_PAGES.filter((p) => p.group !== 'Settings').map((p) => p.href),
);

export function partnerSiderPages(opts: { showOnboarding?: boolean }): DashboardPage[] {
  return filterPagesForUser(
    PARTNER_PAGES.filter((p) => PARTNER_SIDER_HREFS.has(p.href)),
    opts,
  );
}

export function adminSiderPages(opts: { isSuperAdmin?: boolean }): DashboardPage[] {
  return filterPagesForUser(ADMIN_PAGES, opts);
}

export function groupPagesForMenu(pages: DashboardPage[]) {
  const order: string[] = [];
  const byGroup = new Map<string, DashboardPage[]>();
  for (const p of pages) {
    if (!byGroup.has(p.group)) {
      byGroup.set(p.group, []);
      order.push(p.group);
    }
    byGroup.get(p.group)!.push(p);
  }
  return order.map((label) => ({ label, children: byGroup.get(label)! }));
}
