'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';

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
      window.location.href = `${WEB_URL}/login?next=/`;
    }
  }, [user, loading, isImpersonating, logout, router]);

  return { ready: !loading && allowed, webUrl: WEB_URL };
}
