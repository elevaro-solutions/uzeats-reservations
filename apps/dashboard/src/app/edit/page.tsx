'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';

/** Legacy route — restaurant editing lives on the Restaurant profile page. */
export default function EditRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/restaurant-profile');
  }, [router]);

  return <div component="EditRedirectPage" style={{ display: 'contents' }}><div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}><Spin size="large" /></div></div>;
}
