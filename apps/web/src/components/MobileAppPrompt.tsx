'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MOBILE_APPS,
  mobileStorePreference,
  type MobileAppId,
  type MobileStorePreference,
} from '@reservations/shared';

const DISMISS_KEY = 'rt-mobile-app-prompt';

/** Phone, or a tablet-sized screen that is actually touched (not a resized desktop window). */
const HANDHELD_QUERY = '(max-width: 1024px), (max-width: 1366px) and (pointer: coarse)';

function promptCopy(preference: MobileStorePreference): string {
  if (preference === 'ios') return 'Install it from the App Store.';
  if (preference === 'android') return 'Install it from Google Play.';
  return 'Free on iPhone and Android.';
}

export function MobileAppPrompt({ app }: { app: MobileAppId }) {
  const [open, setOpen] = useState(false);
  const [preference, setPreference] = useState<MobileStorePreference>('both');
  const listing = MOBILE_APPS[app];

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      return;
    }
    const media = window.matchMedia(HANDHELD_QUERY);
    const sync = () => {
      setPreference(mobileStorePreference(navigator));
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

  const knownStore = preference === 'ios' || preference === 'android';
  const href = preference === 'ios' ? listing.iosUrl : preference === 'android' ? listing.androidUrl : `/downloads#${app}`;

  return (
    <div className="rt-app-prompt" role="region" aria-label={`Get the ${listing.name} app`}>
      <span className="rt-app-prompt__badge" aria-hidden>
        App
      </span>
      <p className="rt-app-prompt__copy">
        <strong>Get the {listing.name} app.</strong> {promptCopy(preference)}
      </p>
      {knownStore ? (
        <a className="rt-app-prompt__install" href={href} target="_blank" rel="noopener noreferrer">
          Install
        </a>
      ) : (
        <Link className="rt-app-prompt__install" href={href}>
          Install
        </Link>
      )}
      <button type="button" className="rt-app-prompt__close" aria-label="Dismiss app suggestion" onClick={dismiss}>
        ×
      </button>
    </div>
  );
}
