'use client';

import { AdminAccountsList } from '@/components/AdminAccountsList';

export default function AdminOwnersPage() {
  return (
    <div component="AdminOwnersPage" style={{ display: 'contents' }}>
      <AdminAccountsList kind="restaurant_owner" />
    </div>
  );
}
