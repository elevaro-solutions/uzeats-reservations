'use client';

import { AdminAccountDetail } from '@/components/AdminAccountDetail';

export default function AdminStaffDetailPage() {
  return (
    <div component="AdminStaffDetailPage" style={{ display: 'contents' }}>
      <AdminAccountDetail kind="staff" />
    </div>
  );
}
