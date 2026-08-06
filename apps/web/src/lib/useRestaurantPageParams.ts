'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dayjs, { type Dayjs } from 'dayjs';

export const RESTAURANT_SECTIONS = [
  'overview',
  'menu',
  'reviews',
  'photos',
  'details',
  'terms',
  'faq',
] as const;

export type RestaurantSection = (typeof RESTAURANT_SECTIONS)[number];

type BookingParams = {
  date: Dayjs;
  partySize: number;
  selectedSlot: string | null;
  promoCode: string;
};

const DEFAULT_PARTY = 2;

function defaultBookingDate(): Dayjs {
  return dayjs().add(1, 'day');
}

export function useRestaurantPageParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const section = useMemo(() => {
    const raw = searchParams.get('section');
    return RESTAURANT_SECTIONS.includes(raw as RestaurantSection)
      ? (raw as RestaurantSection)
      : 'overview';
  }, [searchParams]);

  const bookingFromUrl = useMemo((): BookingParams => {
    const dateParam = searchParams.get('date');
    const partyParam = searchParams.get('party');
    const slotParam = searchParams.get('slot');
    const promoParam = searchParams.get('promo');
    return {
      date: dateParam ? dayjs(dateParam) : defaultBookingDate(),
      partySize: Number(partyParam ?? DEFAULT_PARTY) || DEFAULT_PARTY,
      selectedSlot: slotParam,
      promoCode: promoParam?.toUpperCase() ?? '',
    };
  }, [
    searchParams.get('date'),
    searchParams.get('party'),
    searchParams.get('slot'),
    searchParams.get('promo'),
    searchParams,
  ]);

  const replaceParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === '') params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      const currentQs = searchParams.toString();
      const currentUrl = currentQs ? `${pathname}?${currentQs}` : pathname;
      if (nextUrl === currentUrl) return;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setSection = useCallback(
    (next: RestaurantSection) => {
      replaceParams({ section: next === 'overview' ? null : next });
    },
    [replaceParams],
  );

  const syncBookingToUrl = useCallback(
    (booking: BookingParams) => {
      const defaultDate = defaultBookingDate().format('YYYY-MM-DD');
      const dateStr = booking.date.format('YYYY-MM-DD');
      replaceParams({
        date: dateStr !== defaultDate ? dateStr : null,
        party: booking.partySize !== DEFAULT_PARTY ? String(booking.partySize) : null,
        slot: booking.selectedSlot,
        promo: booking.promoCode.trim() ? booking.promoCode.trim().toUpperCase() : null,
      });
    },
    [replaceParams],
  );

  return {
    section,
    setSection,
    bookingFromUrl,
    syncBookingToUrl,
  };
}

/** Scroll to section on load when `?section=` is present. */
export function useRestaurantSectionScroll(section: RestaurantSection) {
  useEffect(() => {
    if (section === 'overview') return;
    const el = document.getElementById(section);
    if (!el) return;
    const timer = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => clearTimeout(timer);
  }, [section]);
}
