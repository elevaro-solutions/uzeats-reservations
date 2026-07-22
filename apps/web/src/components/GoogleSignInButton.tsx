'use client';

import { useEffect, useRef, useState } from 'react';
import { colors, typography } from '@reservations/ui';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT_URL}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Sign-In')), {
        once: true,
      });
      if (window.google?.accounts?.id) resolve();
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(script);
  });
}

export function GoogleSignInButton({
  onSuccess,
  loading: externalLoading,
  label = 'Continue with Google',
}: {
  onSuccess: (idToken: string) => void;
  loading?: boolean;
  label?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onSuccess);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  callbackRef.current = onSuccess;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    void (async () => {
      try {
        await loadGsiScript();
        if (cancelled || !containerRef.current) return;

        const accounts = window.google?.accounts;
        if (!accounts) {
          setError('Google Sign-In unavailable');
          return;
        }

        accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) callbackRef.current(response.credential);
          },
          auto_select: false,
        });

        containerRef.current.innerHTML = '';
        const width = Math.min(400, Math.max(240, containerRef.current.offsetWidth || 320));
        accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width,
        });
        setReady(true);
        setError(null);
      } catch {
        if (!cancelled) setError('Google Sign-In failed to load');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div component="GoogleSignInButton"
      style={{
        width: '100%',
        minHeight: 44,
        opacity: externalLoading ? 0.65 : 1,
        pointerEvents: externalLoading ? 'none' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 8,
      }}
      aria-busy={externalLoading || !ready}
      aria-label={label}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
        }}
      />
      {error ? (
        <p
          style={{
            margin: 0,
            textAlign: 'center',
            color: colors.error,
            fontSize: typography.fontSize.sm,
          }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
