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
  /** Short blurb for hub cards and search. */
  description?: string;
  /**
   * When set, page stays in ⌘K search but is omitted from the sider.
   * Sider highlights this parent href while the child route is active.
   */
  parentSiderHref?: string;
};

function page(
  href: string,
  label: string,
  group: string,
  audience: DashboardAudience,
  icon: ReactNode,
  opts?: {
    keywords?: string[];
    when?: 'onboarding' | 'super_admin';
    description?: string;
    parentSiderHref?: string;
  },
): DashboardPage {
  return {
    href,
    label,
    group,
    audience,
    icon,
    keywords: opts?.keywords,
    when: opts?.when,
    description: opts?.description,
    parentSiderHref: opts?.parentSiderHref,
  };
}

/** Partner Hub pages (sidebar + search). Hub children stay searchable via parentSiderHref. */
export const PARTNER_PAGES: DashboardPage[] = [
  page('/', 'Overview', 'Service', 'partner', <DashboardOutlined />, {
    keywords: ['home', 'dashboard'],
  }),
  page('/restaurants', 'My restaurants', 'Service', 'partner', <ShopOutlined />, {
    keywords: ['locations', 'venues'],
  }),
  page('/reservations', 'Reservations', 'Service', 'partner', <CalendarOutlined />, {
    keywords: ['bookings', 'covers'],
  }),
  page('/waitlist', 'Waitlist', 'Service', 'partner', <ClockCircleOutlined />, {
    keywords: ['queue'],
  }),
  page('/floor-ops', 'Live floor', 'Service', 'partner', <AppstoreOutlined />, {
    keywords: ['floor ops', 'service', 'host', 'seating'],
  }),
  page('/restaurant-profile', 'Restaurant profile', 'Service', 'partner', <IdcardOutlined />, {
    keywords: ['name', 'address', 'contact', 'deposit', 'loyalty', 'logo', 'photos'],
    description: 'Name, location, contact, deposits, loyalty, media, and public URL',
    parentSiderHref: '/settings',
  }),
  page('/floor-plan', 'Table layout', 'Service', 'partner', <LayoutOutlined />, {
    keywords: ['floor plan', 'layout', 'canvas', 'map'],
    description: 'Drag tables on the floor canvas for each area',
    parentSiderHref: '/settings',
  }),
  page('/floor', 'Tables & shifts', 'Service', 'partner', <TableOutlined />, {
    keywords: ['areas', 'capacity', 'schedule'],
    description: 'Areas, table capacity, and shift schedules',
    parentSiderHref: '/settings',
  }),
  page('/guests', 'Guests', 'Guests', 'partner', <ContactsOutlined />, {
    keywords: ['crm', 'diners', 'vip'],
  }),
  page('/loyalty', 'Loyalty', 'Guests', 'partner', <TrophyOutlined />, {
    keywords: ['points', 'rewards'],
    description: 'Points, earn rates, and redemption for this restaurant',
    parentSiderHref: '/guests',
  }),
  page('/messages', 'Messages', 'Guests', 'partner', <MessageOutlined />, {
    keywords: ['inbox', 'chat'],
  }),
  page('/reviews', 'Reviews', 'Guests', 'partner', <StarOutlined />, {
    keywords: ['ratings', 'feedback'],
    description: 'Guest ratings and written feedback',
  }),
  page('/grow', 'Grow', 'Grow', 'partner', <RocketOutlined />, {
    keywords: ['marketing', 'promotion', 'hub'],
    description: 'Marketing, listing, campaigns, and bookable offers',
  }),
  page('/marketing', 'Marketing', 'Grow', 'partner', <RocketOutlined />, {
    keywords: ['featured', 'promotion'],
    description: 'Featured placement and promotional boosts',
    parentSiderHref: '/grow',
  }),
  page('/profile', 'Public profile', 'Grow', 'partner', <ShopOutlined />, {
    keywords: ['listing', 'photos', 'faq'],
    description: 'Request diner-facing photos, features, FAQ, and press',
    parentSiderHref: '/grow',
  }),
  page('/booking-widget', 'Booking widget', 'Grow', 'partner', <CodeOutlined />, {
    keywords: ['embed', 'button', 'widget'],
    description: 'Booking link, website embed, and button theme',
    parentSiderHref: '/grow',
  }),
  page('/campaigns', 'Campaigns', 'Grow', 'partner', <MailOutlined />, {
    keywords: ['email', 'newsletter'],
    description: 'Email campaigns and guest newsletters',
    parentSiderHref: '/grow',
  }),
  page('/experiences', 'Experiences', 'Grow', 'partner', <GiftOutlined />, {
    keywords: ['events', 'tickets'],
    description: 'Ticketed events and special experiences',
    parentSiderHref: '/grow',
  }),
  page('/packages', 'Packages', 'Grow', 'partner', <ShopOutlined />, {
    keywords: ['offers', 'deals'],
    description: 'Package offers and dining deals',
    parentSiderHref: '/grow',
  }),
  page('/private-dining', 'Private dining', 'Grow', 'partner', <TeamOutlined />, {
    keywords: ['events', 'rooms'],
    description: 'Private rooms and large-party inquiries',
    parentSiderHref: '/grow',
  }),
  page('/insights', 'Insights', 'Insights', 'partner', <BarChartOutlined />, {
    keywords: ['stats', 'metrics', 'hub'],
    description: 'Analytics and exportable reports',
  }),
  page('/analytics', 'Analytics', 'Insights', 'partner', <BarChartOutlined />, {
    keywords: ['stats', 'metrics'],
    description: 'Covers, status mix, and booking trends',
    parentSiderHref: '/insights',
  }),
  page('/reports', 'Reports', 'Insights', 'partner', <FileTextOutlined />, {
    keywords: ['export', 'csv'],
    description: 'Downloadable reservation and guest reports',
    parentSiderHref: '/insights',
  }),
  page('/onboarding', 'Get started', 'Account', 'partner', <CompassOutlined />, {
    keywords: ['setup', 'checklist'],
    when: 'onboarding',
  }),
  page('/settings', 'Settings', 'Account', 'partner', <SettingOutlined />, {
    keywords: ['configuration', 'preferences'],
  }),
  page('/team', 'Team', 'Account', 'partner', <TeamOutlined />, {
    keywords: ['managers', 'manager', 'invite', 'seats'],
    description: 'Invite managers within your package seat limit',
    parentSiderHref: '/settings',
  }),
  page('/billing', 'Billing', 'Account', 'partner', <DollarOutlined />, {
    keywords: ['subscription', 'plan', 'invoice'],
  }),
  page('/support', 'Support', 'Account', 'partner', <CustomerServiceOutlined />, {
    keywords: ['help', 'ticket', 'contact'],
    description: 'Open a ticket with Tablevera about billing, settings, or the dashboard',
  }),
  // Settings tools (reachable from Settings hub; included in search)
  page('/menu', 'Menu', 'Settings', 'partner', <ReadOutlined />, {
    keywords: ['dishes', 'food', 'dietary'],
    description: 'Sections, dishes, dietary tags, and photos',
    parentSiderHref: '/settings',
  }),
  page('/blackouts', 'Blackouts', 'Settings', 'partner', <StopOutlined />, {
    keywords: ['closed', 'holidays', 'block'],
    description: 'Block dates or hours when you are closed',
    parentSiderHref: '/settings',
  }),
  page('/access-rules', 'Access rules', 'Settings', 'partner', <LockOutlined />, {
    keywords: ['party size', 'lead time', 'limits'],
    description: 'Party size, lead time, and booking limits',
    parentSiderHref: '/settings',
  }),
  page('/surveys', 'Surveys', 'Settings', 'partner', <FormOutlined />, {
    keywords: ['feedback', 'questions'],
    description: 'Post-dining feedback questions and results',
    parentSiderHref: '/settings',
  }),
  page('/groups', 'Groups', 'Settings', 'partner', <ClusterOutlined />, {
    keywords: ['multi-location', 'chain'],
    description: 'Multi-location restaurant groups',
    parentSiderHref: '/settings',
  }),
  page('/integrations', 'Integrations', 'Settings', 'partner', <ApiOutlined />, {
    keywords: ['api', 'pos', 'keys'],
    description: 'API keys, POS, and embed partners',
    parentSiderHref: '/settings',
  }),
  page('/notifications', 'Notifications', 'Settings', 'partner', <BellOutlined />, {
    keywords: ['alerts', 'email', 'sms'],
    description: 'Per-user alert matrix by feature and channel',
    parentSiderHref: '/settings',
  }),
];

/** Platform admin pages (sidebar + search). Group order follows first appearance. */
export const ADMIN_PAGES: DashboardPage[] = [
  page('/admin', 'Overview', 'Support', 'admin', <SafetyOutlined />, {
    keywords: ['home', 'dashboard'],
  }),
  page('/admin/restaurants', 'Restaurants', 'Support', 'admin', <ShopOutlined />, {
    keywords: ['venues', 'locations'],
  }),
  page('/admin/reservations', 'Reservations', 'Support', 'admin', <CalendarOutlined />, {
    keywords: ['bookings'],
  }),
  page('/admin/slug-requests', 'URL slugs', 'Support', 'admin', <LinkOutlined />, {
    keywords: ['vanity', 'url'],
  }),
  page('/admin/profile-requests', 'Profile requests', 'Support', 'admin', <ShopOutlined />, {
    keywords: ['listing', 'changes'],
  }),
  page('/admin/support', 'Tickets', 'Support', 'admin', <CustomerServiceOutlined />, {
    keywords: ['help', 'support'],
  }),
  page('/admin/moderation', 'Moderation', 'Support', 'admin', <FlagOutlined />, {
    keywords: ['reports', 'abuse'],
  }),
  page('/admin/diners', 'Guests', 'Accounts', 'admin', <UserOutlined />, {
    keywords: ['customers', 'diners', 'guests'],
  }),
  page('/admin/owners', 'Restaurant accounts', 'Accounts', 'admin', <IdcardOutlined />, {
    keywords: ['partners', 'owners', 'managers', 'manager'],
  }),
  page('/admin/users', 'Admins', 'Accounts', 'admin', <SafetyOutlined />, {
    keywords: ['admins', 'account managers', 'platform users', 'accounts'],
  }),
  page('/admin/staff', 'Managers', 'Accounts', 'admin', <TeamOutlined />, {
    keywords: ['employees', 'manager', 'managers'],
    description: 'Moved into Restaurant accounts',
    parentSiderHref: '/admin/owners',
  }),
  page('/admin/billing', 'Billing', 'Billing', 'admin', <DollarOutlined />, {
    keywords: ['finance', 'hub', 'mrr'],
    description: 'Invoices, revenue, plans, loyalty, and exports',
  }),
  page('/admin/invoices', 'Invoices', 'Billing', 'admin', <FileDoneOutlined />, {
    keywords: ['billing'],
    description: 'Partner invoices and payment status',
    parentSiderHref: '/admin/billing',
  }),
  page('/admin/revenue', 'Revenue', 'Billing', 'admin', <FundOutlined />, {
    keywords: ['mrr', 'income'],
    description: 'MRR and platform income trends',
    parentSiderHref: '/admin/billing',
  }),
  page('/admin/loyalty', 'Loyalty', 'Billing', 'admin', <TrophyOutlined />, {
    keywords: ['points', 'tiers', 'rewards', 'referral'],
    description: 'Platform loyalty stats, packages, and tiers',
    parentSiderHref: '/admin/billing',
  }),
  page('/admin/churn', 'Churn alerts', 'Billing', 'admin', <WarningOutlined />, {
    keywords: ['retention', 'cancel'],
    description: 'Partners at risk of canceling',
    parentSiderHref: '/admin/billing',
  }),
  page('/admin/pricing', 'Plans & pricing', 'Billing', 'admin', <TagOutlined />, {
    keywords: ['packages', 'subscription'],
    description: 'Subscription plans and cover fees',
    parentSiderHref: '/admin/billing',
  }),
  page('/admin/services', 'Services', 'Billing', 'admin', <AppstoreOutlined />, {
    keywords: ['addons', 'products'],
    description: 'Add-ons and billable products',
    parentSiderHref: '/admin/billing',
  }),
  page('/admin/exports', 'Data exports', 'Billing', 'admin', <DownloadOutlined />, {
    keywords: ['download', 'csv', 'excel'],
    description: 'Bulk CSV, Excel, JSON, and PDF exports',
    parentSiderHref: '/admin/billing',
  }),
  page('/admin/platform', 'Platform', 'Platform', 'admin', <ControlOutlined />, {
    keywords: ['settings', 'hub', 'ops'],
    description: 'Configuration, content, templates, and audit',
  }),
  page('/admin/config', 'Configuration', 'Platform', 'admin', <ControlOutlined />, {
    keywords: ['settings', 'env'],
    description: 'Platform feature flags and defaults',
    parentSiderHref: '/admin/platform',
  }),
  page('/admin/discovery', 'Discovery', 'Platform', 'admin', <CompassOutlined />, {
    keywords: ['images', 'stock'],
    description: 'Stock images and discovery content',
    parentSiderHref: '/admin/platform',
  }),
  page('/admin/blog', 'Blog', 'Platform', 'admin', <FileTextOutlined />, {
    keywords: ['posts', 'cms'],
    description: 'Public blog posts and CMS',
    parentSiderHref: '/admin/platform',
  }),
  page('/admin/docs-access', 'Docs access', 'Platform', 'admin', <BookOutlined />, {
    keywords: ['documentation'],
    description: 'Who can open partner documentation',
    parentSiderHref: '/admin/platform',
  }),
  page('/admin/templates', 'Email templates', 'Platform', 'admin', <MailOutlined />, {
    keywords: ['transactional'],
    description: 'Transactional email copy and layouts',
    parentSiderHref: '/admin/platform',
  }),
  page('/admin/sla', 'SLA metrics', 'Platform', 'admin', <DashboardOutlined />, {
    keywords: ['uptime', 'performance'],
    description: 'Uptime and support performance',
    parentSiderHref: '/admin/platform',
  }),
  page('/admin/audit', 'Audit logs', 'Platform', 'admin', <AuditOutlined />, {
    keywords: ['history', 'activity'],
    description: 'Admin activity and change history',
    parentSiderHref: '/admin/platform',
  }),
  page('/admin/developer', 'Developer', 'Platform', 'admin', <ToolOutlined />, {
    keywords: ['debug', 'tools'],
    description: 'Super-admin debug tools',
    when: 'super_admin',
    parentSiderHref: '/admin/platform',
  }),
];

export type SearchablePage = DashboardPage & {
  /** Optional restaurant switch target shown in partner search. */
  kind?: 'page' | 'restaurant';
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

/** Hub children for card grids on Settings / Grow / Insights / admin hubs. */
export function hubChildPages(
  pages: DashboardPage[],
  parentHref: string,
  opts: { showOnboarding?: boolean; isSuperAdmin?: boolean } = {},
): DashboardPage[] {
  return filterPagesForUser(
    pages.filter((p) => p.parentSiderHref === parentHref),
    opts,
  );
}

export function partnerSiderPages(opts: { showOnboarding?: boolean }): DashboardPage[] {
  return filterPagesForUser(
    PARTNER_PAGES.filter((p) => !p.parentSiderHref),
    opts,
  );
}

export function adminSiderPages(opts: { isSuperAdmin?: boolean }): DashboardPage[] {
  return filterPagesForUser(
    ADMIN_PAGES.filter((p) => !p.parentSiderHref),
    opts,
  );
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

/** Resolve which sider key should stay selected for the current path. */
export function siderKeyForPathname(
  pathname: string,
  audience: DashboardAudience,
): string {
  const pages = audience === 'admin' ? ADMIN_PAGES : PARTNER_PAGES;

  if (audience === 'admin') {
    if (pathname === '/admin' || pathname === '/admin/') return '/admin';
    const segments = pathname.split('/').filter(Boolean);
    const base = segments.length >= 2 ? `/${segments[0]}/${segments[1]}` : pathname;
    const match = pages.find((p) => p.href === base);
    if (match?.parentSiderHref) return match.parentSiderHref;
    return base;
  }

  if (pathname === '/reservations' || pathname.startsWith('/reservations/')) {
    return '/reservations';
  }

  const exact = pages.find((p) => p.href === pathname);
  if (exact?.parentSiderHref) return exact.parentSiderHref;
  if (exact) return exact.href;

  const prefixMatch = pages
    .filter((p) => p.href !== '/' && (pathname === p.href || pathname.startsWith(`${p.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (prefixMatch?.parentSiderHref) return prefixMatch.parentSiderHref;
  if (prefixMatch) return prefixMatch.href;

  return pathname;
}
