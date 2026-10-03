'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@/lib/apollo-hooks';
import { PLATFORM_SETUP_SIGNALS, SETUP_GUIDE_SIGNALS } from '@/lib/graphql';
import {
  buildPartnerSetupGuide,
  buildPlatformSetupGuide,
  getSetupProgress,
  type OnboardingRestaurant,
  type SetupGuide,
  type SetupGuideLocalState,
} from '@/lib/onboarding';
import { canManageTeam, isHostRole } from '@/lib/roles';
import { skipPollWhenHidden } from '@/lib/pollVisibility';

const SIGNALS_POLL_MS = 30_000;

const STORAGE_PREFIX = 'rt-setup-guide';
const CHANGE_EVENT = 'rt-setup-guide-change';

export type SetupGuideStoredState = SetupGuideLocalState & {
  minimized: boolean;
  hidden: boolean;
};

const DEFAULT_STATE: SetupGuideStoredState = {
  skipped: [],
  visited: [],
  minimized: false,
  hidden: false,
};

function storageKey(scope: string, userId: string) {
  return `${STORAGE_PREFIX}:${userId}:${scope}`;
}

function readState(key: string | null): SetupGuideStoredState {
  if (!key || typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<SetupGuideStoredState>;
    return {
      skipped: Array.isArray(parsed.skipped) ? parsed.skipped : [],
      visited: Array.isArray(parsed.visited) ? parsed.visited : [],
      minimized: Boolean(parsed.minimized),
      hidden: Boolean(parsed.hidden),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

/** Per-user, per-scope guide state in localStorage, synced across mounted guide UIs. */
export function useSetupGuideState(scope: string | null | undefined, userId: string | undefined) {
  const key = scope && userId ? storageKey(scope, userId) : null;
  const [state, setState] = useState<SetupGuideStoredState>(DEFAULT_STATE);
  /** Key whose state has been read; `firstVisit` is only meaningful once this matches. */
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [firstVisit, setFirstVisit] = useState(false);

  useEffect(() => {
    setState(readState(key));
    setFirstVisit(Boolean(key) && localStorage.getItem(key!) === null);
    setLoadedKey(key);
    if (!key) return;
    const sync = (e: Event) => {
      if (e instanceof StorageEvent && e.key !== key) return;
      if (e instanceof CustomEvent && e.detail !== key) return;
      setState(readState(key));
    };
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [key]);

  const update = useCallback(
    (patch: (prev: SetupGuideStoredState) => Partial<SetupGuideStoredState>) => {
      if (!key) return;
      const prev = readState(key);
      const next = { ...prev, ...patch(prev) };
      localStorage.setItem(key, JSON.stringify(next));
      setState(next);
      setFirstVisit(false);
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
    },
    [key],
  );

  const actions = useMemo(
    () => ({
      setMinimized: (minimized: boolean) => update(() => ({ minimized })),
      setHidden: (hidden: boolean) => update(() => ({ hidden, minimized: false })),
      markVisited: (taskKey: string) =>
        update((prev) =>
          prev.visited.includes(taskKey) ? {} : { visited: [...prev.visited, taskKey] },
        ),
      skip: (taskKey: string) =>
        update((prev) =>
          prev.skipped.includes(taskKey) ? {} : { skipped: [...prev.skipped, taskKey] },
        ),
      unskip: (taskKey: string) =>
        update((prev) => ({ skipped: prev.skipped.filter((k) => k !== taskKey) })),
    }),
    [update],
  );

  return { state, loaded: Boolean(key) && loadedKey === key, firstVisit, ...actions };
}

type GuideUser = { id: string; role: string };

/**
 * Builds the setup guide for the signed-in user: the active venue's checklist for
 * owners/managers, the platform checklist for admins. Hosts get none.
 */
export function useSetupGuide({
  user,
  isAdmin,
  restaurant,
  refetchRestaurants,
}: {
  user: GuideUser | null | undefined;
  isAdmin: boolean;
  restaurant: OnboardingRestaurant | undefined;
  refetchRestaurants?: () => unknown;
}) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const role = user?.role ?? '';
  const partnerEligible = Boolean(user) && !isAdmin && !isHostRole(role) && Boolean(restaurant);
  const platformEligible = isAdmin && (role === 'admin' || role === 'super_admin');
  const withTeam = canManageTeam(role);

  const { data: partnerData, refetch: refetchPartner } = useQuery(SETUP_GUIDE_SIGNALS, {
    skip: !partnerEligible,
    variables: { restaurantId: restaurant?.id, withTeam },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });
  const { data: platformData, refetch: refetchPlatform } = useQuery(PLATFORM_SETUP_SIGNALS, {
    skip: !platformEligible,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const guide: SetupGuide | null = useMemo(() => {
    if (partnerEligible && restaurant) {
      const seats = partnerData?.restaurantManagerSeats;
      return buildPartnerSetupGuide(restaurant, role, {
        accessRuleCount: partnerData?.accessRules?.length,
        subscriptionStatus: partnerData?.mySubscription?.status,
        accessRulesIncluded: partnerData?.mySubscription?.features?.accessRules,
        depositsEnabled: partnerData?.platformFeatureFlags?.deposits,
        teamSeatsUsed: seats ? (seats.used ?? 0) + (seats.pending ?? 0) : undefined,
      });
    }
    if (platformEligible) {
      return buildPlatformSetupGuide(
        {
          ...(platformData?.platformConfig ?? {}),
          ...(platformData?.adminStats ?? {}),
          adminCount: platformData?.adminUsers?.total,
        },
        role,
      );
    }
    return null;
  }, [partnerEligible, platformEligible, restaurant, role, partnerData, platformData]);

  const local = useSetupGuideState(guide?.scope, user?.id);
  const progress = useMemo(() => getSetupProgress(guide, local.state), [guide, local.state]);

  // Venues that were already live before the guide existed start collapsed to the launcher.
  const { loaded, firstVisit, setMinimized } = local;
  const requiredDone = progress.allRequiredComplete;
  useEffect(() => {
    if (loaded && firstVisit && requiredDone) setMinimized(true);
  }, [loaded, firstVisit, requiredDone, setMinimized]);

  // Most setup work saves in place (approve, add a rule, save config) through the
  // page's own queries, so refresh on any URL change, on focus, and on a slow poll.
  const active = Boolean(guide) && !progress.allComplete;
  const refreshSignals = useCallback(() => {
    if (partnerEligible) {
      void refetchPartner?.();
      void refetchRestaurants?.();
    } else if (platformEligible) {
      void refetchPlatform?.();
    }
  }, [partnerEligible, platformEligible, refetchPartner, refetchPlatform, refetchRestaurants]);

  useEffect(() => {
    if (active) refreshSignals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  useEffect(() => {
    if (!active) return;
    const onFocus = () => refreshSignals();
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(() => {
      if (skipPollWhenHidden()) return;
      if (partnerEligible) void refetchPartner?.();
      else if (platformEligible) void refetchPlatform?.();
    }, SIGNALS_POLL_MS);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [active, refreshSignals, partnerEligible, platformEligible, refetchPartner, refetchPlatform]);

  return { guide, progress, local };
}
