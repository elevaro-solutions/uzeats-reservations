'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

import { getPublicWebUrl } from '@/lib/webUrl';

const PARTNER_ROLES = new Set(['restaurant_owner', 'staff', 'admin']);

/** Partner Hub is for owners, staff, and admins — diners use the web app. */
export function useRequirePartner() {
  const { user, loading, logout, isImpersonating } = useAuth();
  const router = useRouter();

  const allowed =
    Boolean(user) && (PARTNER_ROLES.has(user!.role) || isImpersonating);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role === 'diner' && !isImpersonating) {
      logout();
      window.location.href = `${getPublicWebUrl()}/login?next=/`;
    }
  }, [user, loading, isImpersonating, logout, router]);

  return { ready: !loading && allowed, webUrl: getPublicWebUrl() };
}
