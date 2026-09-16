'use client';

import { AdminAccountsList } from '@/components/AdminAccountsList';

export default function AdminStaffPage() {
  return (
    <div component="AdminStaffPage" style={{ display: 'contents' }}>
      <AdminAccountsList kind="staff" />
    </div>
  );
}
