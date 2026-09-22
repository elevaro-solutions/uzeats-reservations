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

  return <div component="EditRedirectPage" style={{ display: 'contents' }}><Spin size="large" style={{ display: 'block', margin: '80px auto' }} /></div>;
}
