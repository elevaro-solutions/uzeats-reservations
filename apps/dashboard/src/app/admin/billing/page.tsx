'use client';

import { useMemo } from 'react';
import { PageHeader } from '@reservations/ui';
import { HubLinkCards } from '@/components/HubLinkCards';
import { useAuth } from '@/lib/auth';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { ADMIN_PAGES, hubChildPages } from '@/lib/dashboardNav';
import { isSuperAdmin } from '@/lib/roles';

export default function AdminBillingHubPage() {
  useRequireAdmin();
  const { user } = useAuth();

  const links = useMemo(
    () =>
      hubChildPages(ADMIN_PAGES, '/admin/billing', {
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
        title="Billing"
        subtitle="Invoices, revenue, plans, loyalty, churn, and data exports"
      />
      <HubLinkCards links={links} />
    </div>
  );
}
