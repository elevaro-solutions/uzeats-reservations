'use client';

import { AdminAccountDetail } from '@/components/AdminAccountDetail';

export default function AdminOwnerDetailPage() {
  return (
    <div component="AdminOwnerDetailPage" style={{ display: 'contents' }}>
      <AdminAccountDetail kind="restaurant_owner" />
    </div>
  );
}
