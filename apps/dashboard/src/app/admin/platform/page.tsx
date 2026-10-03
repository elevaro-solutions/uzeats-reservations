'use client';

import { useMemo } from 'react';
import { CompassOutlined } from '@ant-design/icons';
import { PageHeader } from '@reservations/ui';
import { HubLinkCards } from '@/components/HubLinkCards';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useSetupGuide } from '@/lib/useSetupGuide';
import { ADMIN_PAGES, hubChildPages } from '@/lib/dashboardNav';
import { isSuperAdmin } from '@/lib/roles';

export default function AdminPlatformHubPage() {
  const { ready, user } = useRequireAdmin();
  const { guide, progress } = useSetupGuide({
    user: ready ? user : null,
    isAdmin: ready,
    restaurant: undefined,
  });

  const links = useMemo(() => {
    const children = hubChildPages(ADMIN_PAGES, '/admin/platform', {
      isSuperAdmin: Boolean(user && isSuperAdmin(user.role)),
    }).map((p) => ({
      href: p.href,
      title: p.label,
      description: p.description ?? '',
      icon: p.icon,
    }));
    // Kept here permanently so the checklist is reachable after the floating guide is dismissed.
    if (!guide) return children;
    return [
      {
        href: '/admin/setup',
        title: 'Platform setup',
        description: progress.allComplete
          ? 'All setup steps complete. Reopen the checklist to review or undo skipped steps.'
          : `${progress.completed} of ${progress.total} setup steps complete`,
        icon: <CompassOutlined />,
      },
      ...children,
    ];
  }, [user, guide, progress.allComplete, progress.completed, progress.total]);

  return (
    <div>
      <PageHeader
        title="Platform"
        subtitle="Configuration, content, email templates, SLA, and audit tools"
      />
      <HubLinkCards links={links} />
    </div>
  );
}
