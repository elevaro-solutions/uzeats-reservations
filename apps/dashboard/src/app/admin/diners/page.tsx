'use client';

import { AdminAccountsList } from '@/components/AdminAccountsList';

export default function AdminDinersPage() {
  return (
    <div component="AdminDinersPage" style={{ display: 'contents' }}>
      <AdminAccountsList kind="diner" />
    </div>
  );
}
