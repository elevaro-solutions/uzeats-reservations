import { Suspense } from 'react';
import DepositPayPage from './DepositPayClient';

export default function Page() {
  return (
    <div component="Page" style={{ display: 'contents' }}><Suspense fallback={<div style={{ padding: 24 }}>Loading payment…</div>}>
      <DepositPayPage />
    </Suspense></div>
  );
}
