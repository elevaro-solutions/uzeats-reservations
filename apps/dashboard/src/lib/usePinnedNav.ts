'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DashboardAudience } from '@/lib/dashboardNav';

const STORAGE_PREFIX = 'rt-pinned-nav';
const CHANGE_EVENT = 'rt-pinned-nav-change';

function storageKey(userId: string, audience: DashboardAudience) {
  return `${STORAGE_PREFIX}:${userId}:${audience}`;
}

function readPinned(key: string | null): string[] {
  if (!key || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((href): href is string => typeof href === 'string');
  } catch {
    return [];
  }
}

/** Per-user pinned hub pages shown in the sidebar under their menu groups. */
export function usePinnedNav(userId: string | undefined, audience: DashboardAudience) {
  const key = userId ? storageKey(userId, audience) : null;
  const [pinnedHrefs, setPinnedHrefs] = useState<string[]>([]);

  useEffect(() => {
    setPinnedHrefs(readPinned(key));
    if (!key) return;
    const sync = (e: Event) => {
      if (e instanceof StorageEvent && e.key !== key) return;
      if (e instanceof CustomEvent && e.detail !== key) return;
      setPinnedHrefs(readPinned(key));
    };
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [key]);

  const setPinned = useCallback(
    (hrefs: string[]) => {
      if (!key) return;
      const unique = [...new Set(hrefs)];
      localStorage.setItem(key, JSON.stringify(unique));
      setPinnedHrefs(unique);
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
    },
    [key],
  );

  const isPinned = useCallback(
    (href: string) => pinnedHrefs.includes(href),
    [pinnedHrefs],
  );

  const togglePinned = useCallback(
    (href: string) => {
      if (!key) return;
      setPinned(
        pinnedHrefs.includes(href)
          ? pinnedHrefs.filter((h) => h !== href)
          : [...pinnedHrefs, href],
      );
    },
    [key, pinnedHrefs, setPinned],
  );

  return useMemo(
    () => ({ pinnedHrefs, isPinned, togglePinned, setPinned }),
    [pinnedHrefs, isPinned, togglePinned, setPinned],
  );
}
