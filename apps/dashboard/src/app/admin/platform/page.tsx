'use client';

import { useMemo } from 'react';
import { PageHeader } from '@reservations/ui';
import { HubLinkCards } from '@/components/HubLinkCards';
import { useAuth } from '@/lib/auth';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { ADMIN_PAGES, hubChildPages } from '@/lib/dashboardNav';
import { isSuperAdmin } from '@/lib/roles';

export default function AdminPlatformHubPage() {
  useRequireAdmin();
  const { user } = useAuth();

  const links = useMemo(
    () =>
      hubChildPages(ADMIN_PAGES, '/admin/platform', {
        isSuperAdmin: Boolean(user && isSuperAdmin(user.role)),
      }).map((p) => ({
        href: p.href,
        title: p.label,
        description: p.description ?? '',
        icon: p.icon,
      })),
    [user],
  );

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
