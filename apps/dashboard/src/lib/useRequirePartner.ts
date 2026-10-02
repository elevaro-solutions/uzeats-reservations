'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

import { getPublicWebUrl } from '@/lib/webUrl';
import { isPartnerHubRole } from '@reservations/shared';

/** Partner Hub is for owners, managers, hosts, and admins — diners use the web app. */
export function useRequirePartner() {
  const { user, loading, logout, isImpersonating } = useAuth();
  const router = useRouter();

  const allowed =
    Boolean(user) && isPartnerHubRole(user!.role) && !user!.needsEmailVerification;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.needsEmailVerification) {
      router.replace('/verify-email');
      return;
    }
    if (user.role !== 'diner') return;
    if (isImpersonating) {
      window.location.href = getPublicWebUrl();
      return;
    }
    logout();
    window.location.href = `${getPublicWebUrl()}/login?next=/`;
  }, [user, loading, isImpersonating, logout, router]);

  return { ready: !loading && allowed, webUrl: getPublicWebUrl() };
}
