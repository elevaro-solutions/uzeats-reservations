'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

/** Redirect non-admins away from admin routes. Returns true while auth/role is resolving. */
export function useRequireAdmin() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!isAdmin) router.replace('/');
  }, [authLoading, user, isAdmin, router]);

  return { user, authLoading, ready: !authLoading && isAdmin };
}
