'use client';

import { useMemo, useState } from 'react';
import { CompassOutlined } from '@ant-design/icons';
import { Input, Typography } from 'antd';
import { PageHeader, spacing } from '@reservations/ui';
import { HubLinkCards, type HubLink } from '@/components/HubLinkCards';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useSetupGuide } from '@/lib/useSetupGuide';
import { ADMIN_PAGES, hubChildPages, type DashboardPage } from '@/lib/dashboardNav';
import { isSuperAdmin } from '@/lib/roles';

const { Text } = Typography;

const PLATFORM_HUB_SECTIONS = [
  'Setup',
  'Configuration',
  'Content',
  'Email',
  'Monitoring',
  'QA',
  'Advanced',
] as const;

function toHubLink(page: DashboardPage): HubLink {
  return {
    href: page.href,
    title: page.label,
    description: page.description ?? '',
    icon: page.icon,
  };
}

function matchesFilter(
  item: { label: string; description?: string; keywords?: string[] },
  query: string,
): boolean {
  if (!query) return true;
  const haystack = [item.label, item.description ?? '', ...(item.keywords ?? [])]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export default function AdminPlatformHubPage() {
  const { ready, user } = useRequireAdmin();
  const [filter, setFilter] = useState('');
  const { guide, progress } = useSetupGuide({
    user: ready ? user : null,
    isAdmin: ready,
    restaurant: undefined,
  });

  const childPages = useMemo(
    () =>
      hubChildPages(ADMIN_PAGES, '/admin/platform', {
        isSuperAdmin: Boolean(user && isSuperAdmin(user.role)),
      }),
    [user],
  );

  const sections = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const bySection = new Map<string, HubLink[]>();

    const push = (section: string, link: HubLink) => {
      const list = bySection.get(section);
      if (list) list.push(link);
      else bySection.set(section, [link]);
    };

    if (
      guide &&
      matchesFilter(
        {
          label: 'Platform setup',
          description: 'Checklist for configuring Stripe, support, packages, and restaurants',
          keywords: ['setup', 'checklist', 'onboarding'],
        },
        q,
      )
    ) {
      push('Setup', {
        href: '/admin/setup',
        title: 'Platform setup',
        description: progress.allComplete
          ? 'All setup steps complete. Reopen the checklist to review or undo skipped steps.'
          : `${progress.completed} of ${progress.total} setup steps complete`,
        icon: <CompassOutlined />,
      });
    }

    for (const page of childPages) {
      if (!matchesFilter(page, q)) continue;
      push(page.hubSection ?? 'Other', toHubLink(page));
    }

    const ordered: { title: string; links: HubLink[] }[] = [];
    for (const title of PLATFORM_HUB_SECTIONS) {
      const links = bySection.get(title);
      if (links?.length) {
        ordered.push({ title, links });
        bySection.delete(title);
      }
    }
    for (const [title, links] of bySection) {
      if (links.length) ordered.push({ title, links });
    }
    return ordered;
  }, [childPages, filter, guide, progress.allComplete, progress.completed, progress.total]);

  return (
    <div>
      <PageHeader
        title="Platform"
        subtitle="Configuration, content, agreements, email templates, SLA, audit, and QA tools"
      />
      <Input.Search
        allowClear
        placeholder="Filter platform tools"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ maxWidth: 360, marginBottom: spacing.lg }}
        aria-label="Filter platform tools"
      />
      {sections.length === 0 ? (
        <Text type="secondary">No tools match “{filter.trim()}”.</Text>
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
