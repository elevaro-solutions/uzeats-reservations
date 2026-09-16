'use client';

import { AdminAccountsList } from '@/components/AdminAccountsList';

export default function AdminUsersPage() {
  return (
    <div component="AdminUsersPage" style={{ display: 'contents' }}>
      <AdminAccountsList kind="platform" />
    </div>
  );
}
