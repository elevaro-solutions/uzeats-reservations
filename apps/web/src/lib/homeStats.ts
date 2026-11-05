import { cache } from 'react';
import { serverGraphql } from '@/lib/serverGraphql';

export type HomeStats = {
  restaurants: number;
  cities: number;
  dinersServed: number;
  averageRating: number | null;
  reviewCount: number;
};

/** The API already caches totals for 24h; a shorter page cache keeps worst-case staleness near 25h, not 48h. */
const HOME_STATS_REVALIDATE_SEC = 60 * 60;

const HOME_STATS_QUERY = `
  query HomeStats {
    homeStats {
      restaurants
      cities
      dinersServed
      averageRating
      reviewCount
    }
  }
`;

export const fetchHomeStats = cache(async (): Promise<HomeStats | null> => {
  try {
    const data = await serverGraphql<{ homeStats: HomeStats }>(
      HOME_STATS_QUERY,
      undefined,
      { revalidate: HOME_STATS_REVALIDATE_SEC, tags: ['home-stats'] },
    );
    return data.homeStats;
  } catch {
    return null;
  }
});

/** Exact below 1,000; otherwise rounded down with a "+" so the hero never overstates. */
export function formatHeroCount(value: number): string {
  if (value < 1000) return value.toLocaleString('en-US');
  const units: Array<[number, string]> = [
    [1_000_000, 'M'],
    [1_000, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (value >= size) {
      const scaled = Math.floor((value / size) * 10) / 10;
      const text = scaled >= 100 ? Math.floor(scaled).toString() : scaled.toString();
      return `${text}${suffix}+`;
    }
  }
  return value.toLocaleString('en-US');
}

export type HeroStat = { value: string; label: string };

export function buildHeroStats(stats: HomeStats | null): HeroStat[] {
  if (!stats) return [];
  const items: HeroStat[] = [];
  if (stats.restaurants > 0) {
    items.push({
      value: formatHeroCount(stats.restaurants),
      label: stats.restaurants === 1 ? 'Restaurant' : 'Restaurants',
    });
  }
  if (stats.cities > 0) {
    items.push({
      value: formatHeroCount(stats.cities),
      label: stats.cities === 1 ? 'City' : 'Cities',
    });
  }
  if (stats.dinersServed > 0) {
    items.push({
      value: formatHeroCount(stats.dinersServed),
      label: stats.dinersServed === 1 ? 'Diner served' : 'Diners served',
    });
  }
  if (stats.averageRating != null && stats.reviewCount > 0) {
    items.push({ value: `${stats.averageRating.toFixed(1)}★`, label: 'Average rating' });
  }
  return items;
}
