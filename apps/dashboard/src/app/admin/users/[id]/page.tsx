'use client';

import { AdminAccountDetail } from '@/components/AdminAccountDetail';

export default function AdminUserDetailPage() {
  return (
    <div component="AdminUserDetailPage" style={{ display: 'contents' }}>
      <AdminAccountDetail kind="platform" />
    </div>
  );
}
