'use client';

import { Suspense } from 'react';
import ResetPasswordForm from './ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <div component="ResetPasswordPage" style={{ display: 'contents' }}><Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <ResetPasswordForm />
    </Suspense></div>
  );
}
