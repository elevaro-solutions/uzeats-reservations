export function formatPriceRange(priceRange: number): string {
  const n = Math.min(4, Math.max(1, Math.round(priceRange)));
  return "$".repeat(n);
}
