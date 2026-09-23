'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Spin } from 'antd';

/** Managers live under Restaurant accounts. */
export default function AdminStaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  useEffect(() => {
    router.replace(id ? `/admin/owners/${id}` : '/admin/owners');
  }, [id, router]);

  return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <Spin size="large" />
    </div>
  );
}
