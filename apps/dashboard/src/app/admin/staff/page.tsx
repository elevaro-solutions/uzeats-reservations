'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';

/** Managers live under Restaurant accounts. */
export default function AdminStaffPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/owners');
  }, [router]);
  return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <Spin size="large" />
    </div>
  );
}
