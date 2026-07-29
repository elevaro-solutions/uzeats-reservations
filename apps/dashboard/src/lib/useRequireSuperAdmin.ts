'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/roles';

/** Redirect non–super-admins away from super-admin-only routes. */
export function useRequireSuperAdmin() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const allowed = user ? isSuperAdmin(user.role) : false;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!allowed) router.replace('/admin');
  }, [authLoading, user, allowed, router]);

  return { user, authLoading, ready: !authLoading && allowed };
}
