'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDashboardUrl } from '@/lib/urls';

function AcceptInviteRedirect() {
  const search = useSearchParams();
  const token = search.get('token');

  useEffect(() => {
    const base = getDashboardUrl();
    const target = token
      ? `${base}/accept-invite?token=${encodeURIComponent(token)}`
      : `${base}/login`;
    window.location.replace(target);
  }, [token]);

  return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      Redirecting to Partner Hub…
    </div>
  );
}

/** Legacy web URL from older invite emails → Partner Hub accept page. */
export default function AcceptInvitePage() {
  return (
    <div component="WebAcceptInviteRedirect" style={{ display: 'contents' }}>
      <Suspense fallback={<div style={{ padding: 48, textAlign: 'center' }}>Redirecting…</div>}>
        <AcceptInviteRedirect />
      </Suspense>
    </div>
  );
}
