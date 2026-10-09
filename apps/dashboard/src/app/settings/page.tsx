'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Tag, Typography } from 'antd';
import { PageHeader, spacing } from '@reservations/ui';
import { HubLinkCards, type HubLink } from '@/components/HubLinkCards';
import { useAuth } from '@/lib/auth';
import { hubChildPages, PARTNER_PAGES, type DashboardPage } from '@/lib/dashboardNav';

const { Text } = Typography;

const SETTINGS_HUB_SECTIONS = [
  'Restaurant',
  'Floor and layout',
  'Booking',
  'Team and access',
] as const;

function toHubLink(page: DashboardPage): HubLink {
  const isVirtualRoom = page.href === '/virtual-room';
  const description =
    isVirtualRoom && page.description?.startsWith('Experimental:')
      ? page.description.replace(/^Experimental:\s*/, '')
      : (page.description ?? '');

  return {
    href: page.href,
    title: page.label,
    description,
    icon: page.icon,
    badge: isVirtualRoom ? <Tag color="purple">Experimental</Tag> : undefined,
  };
}

function matchesFilter(page: DashboardPage, query: string): boolean {
  if (!query) return true;
  const haystack = [page.label, page.description ?? '', ...(page.keywords ?? [])]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const childPages = useMemo(() => hubChildPages(PARTNER_PAGES, '/settings'), []);

  const sections = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = childPages.filter((p) => matchesFilter(p, q));
    const bySection = new Map<string, DashboardPage[]>();

    for (const page of filtered) {
      const key = page.hubSection ?? 'Other';
      const list = bySection.get(key);
      if (list) list.push(page);
      else bySection.set(key, [page]);
    }

    const ordered: { title: string; links: HubLink[] }[] = [];
    for (const title of SETTINGS_HUB_SECTIONS) {
      const pages = bySection.get(title);
      if (pages?.length) {
        ordered.push({ title, links: pages.map(toHubLink) });
        bySection.delete(title);
      }
    }
    for (const [title, pages] of bySection) {
      if (pages.length) ordered.push({ title, links: pages.map(toHubLink) });
    }
    return ordered;
  }, [childPages, filter]);

  return (
    <div component="SettingsPage" style={{ display: 'contents' }}>
      <PageHeader
        title="Settings"
        subtitle="Restaurant profile, booking preferences, and setup tools"
      />
      <Input.Search
        allowClear
        placeholder="Filter settings"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ maxWidth: 360, marginBottom: spacing.lg }}
        aria-label="Filter settings"
      />
      {sections.length === 0 ? (
        <Text type="secondary">No settings match “{filter.trim()}”.</Text>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
          {sections.map((section) => (
            <section key={section.title}>
              <Text
                type="secondary"
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: spacing.sm,
                }}
              >
                {section.title}
              </Text>
              <HubLinkCards links={section.links} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
