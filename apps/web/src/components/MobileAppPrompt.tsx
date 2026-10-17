'use client';

import { useEffect, useState } from 'react';
import { MOBILE_APPS, type MobileAppId } from '@reservations/shared';

const DISMISS_KEY = 'rt-mobile-app-prompt';

/** Phone, or a tablet-sized screen that is actually touched (not a resized desktop window). */
const HANDHELD_QUERY = '(max-width: 1024px), (max-width: 1366px) and (pointer: coarse)';

function isIosDevice() {
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/i.test(ua);
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOs;
}

export function MobileAppPrompt({ app }: { app: MobileAppId }) {
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const listing = MOBILE_APPS[app];

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      return;
    }
    const media = window.matchMedia(HANDHELD_QUERY);
    const sync = () => {
      setIos(isIosDevice());
      setOpen(media.matches);
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  if (!open) return null;

  const dismiss = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* private mode */
    }
  };

  return (
    <div className="rt-app-prompt" role="region" aria-label={`Get the ${listing.name} app`}>
      <p className="rt-app-prompt__copy">
        {ios ? (
          <>
            <strong>{listing.name} for iPhone and iPad is coming soon.</strong>
          </>
        ) : (
          <>
            <strong>Get the {listing.name} app.</strong> Install it from Google Play.
          </>
        )}
      </p>
      {ios ? null : (
        <a
          className="rt-app-prompt__install"
          href={listing.androidUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Install
        </a>
      )}
      <button type="button" className="rt-app-prompt__close" aria-label="Dismiss app suggestion" onClick={dismiss}>
        ×
      </button>
    </div>
  );
}
