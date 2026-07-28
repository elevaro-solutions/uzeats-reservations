'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isPlatformAdmin } from '@/lib/roles';

/** Redirect non-admins away from admin routes. Returns true while auth/role is resolving. */
export function useRequireAdmin() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const isAdmin = user ? isPlatformAdmin(user.role) : false;

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
