import React, { type ReactNode, useEffect, useState } from 'react';
import { fetchDocsAccessSession } from '@site/src/lib/api';

type Props = { children: ReactNode };

function redirectToSignIn() {
  const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(`/access/index.html?next=${encodeURIComponent(next)}`);
}

export default function Root({ children }: Props) {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    fetchDocsAccessSession()
      .then((session) => {
        if (session.granted) setGranted(true);
        else redirectToSignIn();
      })
      .catch(redirectToSignIn);
  }, []);

  if (!granted) {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <p>Checking access…</p>
      </div>
    );
  }

  return <>{children}</>;
}
