import React, { type ReactNode, useCallback, useEffect, useState } from 'react';
import DocsAccessGate from '@site/src/components/DocsAccessGate';
import { fetchDocsAccessSession } from '@site/src/lib/api';

type Props = { children: ReactNode };

export default function Root({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [granted, setGranted] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const session = await fetchDocsAccessSession();
      setGranted(session.granted);
    } catch {
      setGranted(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <p>Checking access…</p>
      </div>
    );
  }

  if (!granted) {
    return <DocsAccessGate onGranted={() => setGranted(true)} />;
  }

  return <>{children}</>;
}
