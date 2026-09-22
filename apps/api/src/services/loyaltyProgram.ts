import {
  defaultLoyaltyProgram,
  type LoyaltyProgram,
  type LoyaltyRates,
  type LoyaltyTierDef,
} from '@reservations/shared';
import { ValidationError } from '../lib/errors.js';
import { getPlatformConfig } from './platformConfig.js';

const MAX_POINTS = 1_000_000;
const MAX_TIERS = 12;

type LoyaltyProgramCache = { value: LoyaltyProgram; at: number };

let cache: LoyaltyProgramCache | null = null;
const CACHE_MS = 15_000;

function intField(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(max, Math.max(min, n));
}

function slugifyTierId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  return slug || 'tier';
}

function uniqueTierId(name: string, used: Set<string>, preferred?: string | null): string {
  const base = (preferred?.trim() || slugifyTierId(name)).toLowerCase().slice(0, 24);
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

export function mapLoyaltyProgram(raw: unknown): LoyaltyProgram {
  const defaults = defaultLoyaltyProgram();
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const mappedTiers = Array.isArray(src.tiers)
    ? src.tiers
        .map((row) => {
          if (!row || typeof row !== 'object') return null;
          const t = row as Record<string, unknown>;
          const name = typeof t.name === 'string' ? t.name.trim() : '';
          const id = typeof t.id === 'string' ? t.id.trim().toLowerCase() : '';
          if (!name || !id) return null;
          return {
            id,
            name,
            minVisits: intField(t.minVisits, 0, 0, 10_000),
            earnMultiplier:
              typeof t.earnMultiplier === 'number' && Number.isFinite(t.earnMultiplier)
                ? Math.min(10, Math.max(0.1, t.earnMultiplier))
                : 1,
          } satisfies LoyaltyTierDef;
        })
        .filter((t): t is LoyaltyTierDef => Boolean(t))
    : [];

  return {
    pointsPerCompletedVisit: intField(
      src.pointsPerCompletedVisit,
      defaults.pointsPerCompletedVisit,
      0,
      MAX_POINTS,
    ),
    pointsPerDollarDeposit: intField(
      src.pointsPerDollarDeposit,
      defaults.pointsPerDollarDeposit,
      0,
      MAX_POINTS,
    ),
    redeemPointsPerDollar: intField(
      src.redeemPointsPerDollar,
      defaults.redeemPointsPerDollar,
      1,
      MAX_POINTS,
    ),
    minRedeemPoints: intField(src.minRedeemPoints, defaults.minRedeemPoints, 0, MAX_POINTS),
    firstBookingBonusPoints: intField(
      src.firstBookingBonusPoints,
      defaults.firstBookingBonusPoints,
      0,
      MAX_POINTS,
    ),
    pointsPerReview: intField(src.pointsPerReview, defaults.pointsPerReview, 0, MAX_POINTS),
    referralBonusPoints: intField(
      src.referralBonusPoints,
      defaults.referralBonusPoints,
      0,
      MAX_POINTS,
    ),
    pointsExpiryMonths: intField(src.pointsExpiryMonths, defaults.pointsExpiryMonths, 0, 120),
    tiers: mappedTiers.length > 0 ? mappedTiers.sort((a, b) => a.minVisits - b.minVisits) : defaults.tiers,
  };
}

export function peekLoyaltyProgram(): LoyaltyProgram {
  return cache?.value ?? defaultLoyaltyProgram();
}

export function invalidateLoyaltyProgramCache() {
  cache = null;
}

function setCache(value: LoyaltyProgram) {
  cache = { value, at: Date.now() };
}

export async function getLoyaltyProgram(): Promise<LoyaltyProgram> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const doc = await getPlatformConfig();
  const value = mapLoyaltyProgram((doc as { loyalty?: unknown }).loyalty);
  setCache(value);
  return value;
}

function normalizeTiers(input: Array<Partial<LoyaltyTierDef>>): LoyaltyTierDef[] {
  if (input.length === 0) {
    throw new ValidationError('Add at least one loyalty tier');
  }
  if (input.length > MAX_TIERS) {
    throw new ValidationError(`At most ${MAX_TIERS} loyalty tiers`);
  }

  const usedIds = new Set<string>();
  const tiers: LoyaltyTierDef[] = [];
  for (const row of input) {
    const name = (row.name ?? '').trim();
    if (name.length < 1 || name.length > 40) {
      throw new ValidationError('Each tier needs a name (1–40 characters)');
    }
    const minVisits = intField(row.minVisits, 0, 0, 10_000);
    const earnMultiplier =
      typeof row.earnMultiplier === 'number' && Number.isFinite(row.earnMultiplier)
        ? row.earnMultiplier
        : NaN;
    if (!Number.isFinite(earnMultiplier) || earnMultiplier < 0.1 || earnMultiplier > 10) {
      throw new ValidationError('Earn multiplier must be between 0.1× and 10×');
    }
    const id = uniqueTierId(name, usedIds, row.id);
    usedIds.add(id);
    tiers.push({
      id,
      name,
      minVisits,
      earnMultiplier: Math.round(earnMultiplier * 100) / 100,
    });
  }

  const visits = new Set<number>();
  for (const tier of tiers) {
    if (visits.has(tier.minVisits)) {
      throw new ValidationError('Each tier needs a unique visit threshold');
    }
    visits.add(tier.minVisits);
  }
  if (![...visits].includes(0)) {
    throw new ValidationError('Keep one starting tier at 0 completed visits');
  }

  return tiers.sort((a, b) => a.minVisits - b.minVisits);
}

export type LoyaltyProgramInput = Partial<LoyaltyRates> & {
  tiers?: Array<Partial<LoyaltyTierDef>> | null;
};

export async function updateLoyaltyProgram(input: LoyaltyProgramInput): Promise<LoyaltyProgram> {
  const current = await getLoyaltyProgram();
  const next: LoyaltyProgram = {
    pointsPerCompletedVisit:
      input.pointsPerCompletedVisit !== undefined
        ? intField(input.pointsPerCompletedVisit, current.pointsPerCompletedVisit, 0, MAX_POINTS)
        : current.pointsPerCompletedVisit,
    pointsPerDollarDeposit:
      input.pointsPerDollarDeposit !== undefined
        ? intField(input.pointsPerDollarDeposit, current.pointsPerDollarDeposit, 0, MAX_POINTS)
        : current.pointsPerDollarDeposit,
    redeemPointsPerDollar:
      input.redeemPointsPerDollar !== undefined
        ? intField(input.redeemPointsPerDollar, current.redeemPointsPerDollar, 1, MAX_POINTS)
        : current.redeemPointsPerDollar,
    minRedeemPoints:
      input.minRedeemPoints !== undefined
        ? intField(input.minRedeemPoints, current.minRedeemPoints, 0, MAX_POINTS)
        : current.minRedeemPoints,
    firstBookingBonusPoints:
      input.firstBookingBonusPoints !== undefined
        ? intField(input.firstBookingBonusPoints, current.firstBookingBonusPoints, 0, MAX_POINTS)
        : current.firstBookingBonusPoints,
    pointsPerReview:
      input.pointsPerReview !== undefined
        ? intField(input.pointsPerReview, current.pointsPerReview, 0, MAX_POINTS)
        : current.pointsPerReview,
    referralBonusPoints:
      input.referralBonusPoints !== undefined
        ? intField(input.referralBonusPoints, current.referralBonusPoints, 0, MAX_POINTS)
        : current.referralBonusPoints,
    pointsExpiryMonths:
      input.pointsExpiryMonths !== undefined
        ? intField(input.pointsExpiryMonths, current.pointsExpiryMonths, 0, 120)
        : current.pointsExpiryMonths,
    tiers: input.tiers ? normalizeTiers(input.tiers) : current.tiers,
  };

  const doc = await getPlatformConfig();
  (doc as { loyalty?: LoyaltyProgram }).loyalty = next;
  doc.markModified('loyalty');
  await doc.save();
  setCache(next);
  return next;
}
