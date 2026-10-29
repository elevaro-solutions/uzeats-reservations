'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SessionPreparing } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { partnerLandingPath } from '@/lib/roles';

/** Root redirects to the role-appropriate landing (owners → `/overview`). */
export default function HomeRedirectPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    router.replace(partnerLandingPath(user.role));
  }, [authLoading, user, router]);

  return <SessionPreparing variant="partner" />;
}
