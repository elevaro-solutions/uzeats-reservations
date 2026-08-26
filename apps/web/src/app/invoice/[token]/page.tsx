import { Suspense } from 'react';
import InvoicePayClient from './InvoicePayClient';

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div component="InvoicePayPage" style={{ display: 'contents' }}>
      <Suspense fallback={<div style={{ padding: 24 }}>Loading invoice…</div>}>
        <InvoicePayClient token={token} />
      </Suspense>
    </div>
  );
}
