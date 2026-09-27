'use client';

import {
  attributionFromSearchParams,
  hasUtmParams,
  type ReservationAttributionInput,
} from '@reservations/shared';

const STORAGE_KEY = 'tablevera_booking_attribution';

type StoredAttribution = ReservationAttributionInput & {
  capturedAt: string;
};

function readStored(): StoredAttribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAttribution;
  } catch {
    return null;
  }
}

function writeStored(value: StoredAttribution) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // private mode / quota — ignore
  }
}

/**
 * First-touch capture: when the URL has UTMs (or we have no session yet),
 * persist landing path + referrer for the booking create mutation.
 */
export function captureBookingAttributionFromLocation(
  href = typeof window !== 'undefined' ? window.location.href : '',
  referrer = typeof document !== 'undefined' ? document.referrer : '',
) {
  if (typeof window === 'undefined' || !href) return;

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return;
  }

  const existing = readStored();
  const params = url.searchParams;
  const hasUtms = hasUtmParams(params);

  // Keep first touch once we have UTMs; otherwise refresh landing for bare sessions.
  if (existing?.utmSource && !hasUtms) return;

  const utms = attributionFromSearchParams(params);
  const landingPath = `${url.pathname}${url.search}`;

  writeStored({
    ...utms,
    landingPath: hasUtms || !existing?.landingPath ? landingPath : existing.landingPath,
    referrer: existing?.referrer || (referrer && !referrer.includes(url.host) ? referrer : undefined),
    capturedAt: existing?.capturedAt ?? new Date().toISOString(),
  });
}

/** Payload for createReservation — first-touch UTMs + current page as originUrl. */
export function getBookingAttributionForSubmit(): ReservationAttributionInput {
  const stored: ReservationAttributionInput = readStored() ?? {};
  const originUrl =
    typeof window !== 'undefined' ? window.location.href.slice(0, 1000) : undefined;

  let raw: ReservationAttributionInput;
  if (typeof window !== 'undefined') {
    try {
      const url = new URL(window.location.href);
      const pageUtms = attributionFromSearchParams(url.searchParams);
      raw = {
        utmSource: stored.utmSource ?? pageUtms.utmSource,
        utmMedium: stored.utmMedium ?? pageUtms.utmMedium,
        utmCampaign: stored.utmCampaign ?? pageUtms.utmCampaign,
        utmContent: stored.utmContent ?? pageUtms.utmContent,
        utmTerm: stored.utmTerm ?? pageUtms.utmTerm,
        landingPath: stored.landingPath ?? `${url.pathname}${url.search}`.slice(0, 500),
        originUrl,
        referrer: stored.referrer,
      };
    } catch {
      raw = { ...stored, originUrl };
    }
  } else {
    raw = { ...stored, originUrl };
  }

  const out: ReservationAttributionInput = {};
  for (const [key, value] of Object.entries(raw) as Array<
    [keyof ReservationAttributionInput, string | undefined]
  >) {
    if (typeof value === 'string' && value.trim()) {
      out[key] = value.trim();
    }
  }
  return out;
}
