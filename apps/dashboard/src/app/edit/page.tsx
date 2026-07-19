'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';

/** Legacy route — restaurant editing lives under Settings. */
export default function EditRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings');
  }, [router]);

  return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
}
