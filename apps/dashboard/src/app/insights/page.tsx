'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@reservations/ui';
import { HubLinkCards } from '@/components/HubLinkCards';
import { useAuth } from '@/lib/auth';
import { hubChildPages, PARTNER_PAGES } from '@/lib/dashboardNav';

export default function InsightsHubPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const links = useMemo(
    () =>
      hubChildPages(PARTNER_PAGES, '/insights').map((p) => ({
        href: p.href,
        title: p.label,
        description: p.description ?? '',
        icon: p.icon,
      })),
    [],
  );

  return (
    <div>
      <PageHeader
        title="Insights"
        subtitle="Analytics and reports for covers, status mix, and exports"
      />
      <HubLinkCards links={links} colProps={{ xs: 24, sm: 12, lg: 12 }} />
    </div>
  );
}
