'use client';

import { AdminAccountDetail } from '@/components/AdminAccountDetail';

export default function AdminDinerDetailPage() {
  return (
    <div component="AdminDinerDetailPage" style={{ display: 'contents' }}>
      <AdminAccountDetail kind="diner" />
    </div>
  );
}
