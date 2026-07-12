import { Suspense } from 'react';
import DepositPayPage from './DepositPayClient';

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading payment…</div>}>
      <DepositPayPage />
    </Suspense>
  );
}
