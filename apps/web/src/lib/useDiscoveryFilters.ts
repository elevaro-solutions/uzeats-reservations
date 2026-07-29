'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';

export type DiscoveryFilterState = {
  query: string;
  cuisine?: string;
  priceRange?: number;
  categoryIds: string[];
  occasions: string[];
  diningStyles: string[];
  meals: string[];
  dietaryTags: string[];
  amenities: string[];
  topRatedOnly: boolean;
  accessibleOnly: boolean;
  lat?: number;
  lng?: number;
  locationLabel?: string;
  nearMe: boolean;
  date: string;
  partySize: number;
  view: 'list' | 'map';
};

const DEFAULT_DATE = dayjs().add(1, 'day').format('YYYY-MM-DD');

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').map((v) => v.trim()).filter(Boolean);
}

function joinList(values: string[]): string | undefined {
  return values.length ? values.join(',') : undefined;
}

export function defaultDiscoveryFilters(): DiscoveryFilterState {
  return {
    query: '',
    categoryIds: [],
    occasions: [],
    diningStyles: [],
    meals: [],
    dietaryTags: [],
    amenities: [],
    topRatedOnly: false,
    accessibleOnly: false,
    nearMe: false,
    date: DEFAULT_DATE,
    partySize: 2,
    view: 'list',
  };
}

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function discoveryFiltersFromSearchParams(
  params: URLSearchParams,
): DiscoveryFilterState {
  const view = params.get('view') === 'map' ? 'map' : 'list';
  return {
    query: params.get('q') ?? '',
    cuisine: params.get('cuisine') ?? undefined,
    priceRange: parseNumber(params.get('price')),
    categoryIds: parseList(params.get('categories')),
    occasions: parseList(params.get('occasions')),
    diningStyles: parseList(params.get('styles')),
    meals: parseList(params.get('meals')),
    dietaryTags: parseList(params.get('dietary')),
    amenities: parseList(params.get('amenities')),
    topRatedOnly: params.get('top') === '1',
    accessibleOnly: params.get('accessible') === '1',
    lat: parseNumber(params.get('lat')),
    lng: parseNumber(params.get('lng')),
    locationLabel: params.get('loc') ?? undefined,
    nearMe: params.get('near') === '1',
    date: params.get('date') ?? DEFAULT_DATE,
    partySize: parseNumber(params.get('party')) ?? 2,
    view,
  };
}

export function discoveryFiltersToSearchParams(
  filters: DiscoveryFilterState,
  page?: number,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.cuisine) params.set('cuisine', filters.cuisine);
  if (filters.priceRange != null) params.set('price', String(filters.priceRange));
  const categories = joinList(filters.categoryIds);
  if (categories) params.set('categories', categories);
  const occasions = joinList(filters.occasions);
  if (occasions) params.set('occasions', occasions);
  const styles = joinList(filters.diningStyles);
  if (styles) params.set('styles', styles);
  const meals = joinList(filters.meals);
  if (meals) params.set('meals', meals);
  const dietary = joinList(filters.dietaryTags);
  if (dietary) params.set('dietary', dietary);
  const amenities = joinList(filters.amenities);
  if (amenities) params.set('amenities', amenities);
  if (filters.topRatedOnly) params.set('top', '1');
  if (filters.accessibleOnly) params.set('accessible', '1');
  if (filters.lat != null) params.set('lat', String(filters.lat));
  if (filters.lng != null) params.set('lng', String(filters.lng));
  if (filters.locationLabel) params.set('loc', filters.locationLabel);
  if (filters.nearMe) params.set('near', '1');
  if (filters.date !== DEFAULT_DATE) params.set('date', filters.date);
  if (filters.partySize !== 2) params.set('party', String(filters.partySize));
  if (filters.view === 'map') params.set('view', 'map');
  if (page && page > 1) params.set('page', String(page));
  return params;
}

export function useDiscoveryUrlSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => discoveryFiltersFromSearchParams(searchParams),
    [searchParams],
  );

  const replaceFilters = useCallback(
    (next: Partial<DiscoveryFilterState>, page?: number) => {
      const merged = { ...filters, ...next };
      const params = discoveryFiltersToSearchParams(merged, page);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  return { filters, replaceFilters };
}
