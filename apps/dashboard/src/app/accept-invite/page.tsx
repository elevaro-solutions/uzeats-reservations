'use client';

import { Suspense } from 'react';
import AcceptInviteForm from './AcceptInviteForm';

export default function AcceptInvitePage() {
  return (
    <div component="AcceptInvitePage" style={{ display: 'contents' }}>
      <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
        <AcceptInviteForm />
      </Suspense>
    </div>
  );
}
