'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { captureBookingAttributionFromLocation } from '@/lib/bookingAttribution';

/** Persists first-touch UTMs / landing path in sessionStorage for createReservation. */
export function BookingAttributionCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureBookingAttributionFromLocation();
  }, [pathname, searchParams]);

  return null;
}
