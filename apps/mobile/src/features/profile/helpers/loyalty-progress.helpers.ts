import {
  LOYALTY_TIERS,
  resolveLoyaltyTier,
  type LoyaltyTierId,
  type LoyaltyTierInfo,
} from "@reservations/shared";

export type LoyaltyTierProgress = {
  currentTier: LoyaltyTierInfo;
  nextTier: LoyaltyTierInfo["nextTier"];
  /** Visits completed (capped display uses raw count in caption). */
  completedVisits: number;
  /** Visits required to unlock next tier; null at max tier. */
  visitsTarget: number | null;
  /** 0–1 fill for the progress ring. */
  progress01: number;
  caption: string;
  isMaxTier: boolean;
};

export function getLoyaltyTierProgress(
  completedVisits: number,
): LoyaltyTierProgress {
  const visits = Math.max(0, Math.floor(completedVisits));
  const currentTier = resolveLoyaltyTier(visits);
  const nextTier = currentTier.nextTier;

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      completedVisits: visits,
      visitsTarget: null,
      progress01: 1,
      caption: "Top tier unlocked",
      isMaxTier: true,
    };
  }

  const visitsTarget = nextTier.minVisits;
  const progress01 = Math.min(1, visits / visitsTarget);
  const visitsRemaining = Math.max(0, visitsTarget - visits);

  return {
    currentTier,
    nextTier,
    completedVisits: visits,
    visitsTarget,
    progress01,
    caption: `${visitsRemaining} ${visitsRemaining === 1 ? "visit" : "visits"} to ${nextTier.name}`,
    isMaxTier: false,
  };
}

/** 0–1 fill across the full Bronze→Silver→Gold track (segment-aware). */
export function getLoyaltyTrackFill01(progress: LoyaltyTierProgress): number {
  if (progress.isMaxTier) return 1;

  const currentIndex = LOYALTY_TIERS.findIndex(
    (tier) => tier.id === progress.currentTier.id,
  );
  if (currentIndex < 0) return 0;

  const segments = LOYALTY_TIERS.length - 1;
  if (segments <= 0) return 1;

  const current = LOYALTY_TIERS[currentIndex]!;
  const next = LOYALTY_TIERS[currentIndex + 1];
  if (!next) return 1;

  const span = next.minVisits - current.minVisits;
  const local =
    span <= 0
      ? 1
      : (progress.completedVisits - current.minVisits) / span;

  return Math.min(1, (currentIndex + Math.min(1, Math.max(0, local))) / segments);
}

/** Feature-local palette (not theme tokens) so bronze / silver / gold stay distinct. */
export type LoyaltyTierColors = {
  icon: string;
  soft: string;
  emphasis: string;
};

const LOYALTY_TIER_PALETTE: Record<LoyaltyTierId, LoyaltyTierColors> = {
  bronze: {
    soft: "#F4DCC8",
    emphasis: "#C56A2D",
    icon: "#8B3E12",
  },
  silver: {
    soft: "#D7E0EB",
    emphasis: "#7A8B9E",
    icon: "#3E4F61",
  },
  gold: {
    soft: "#F3E2A3",
    emphasis: "#E0A800",
    icon: "#6B4F00",
  },
};

export function getLoyaltyTierColors(tierId: LoyaltyTierId): LoyaltyTierColors {
  return LOYALTY_TIER_PALETTE[tierId] ?? LOYALTY_TIER_PALETTE.bronze;
}
