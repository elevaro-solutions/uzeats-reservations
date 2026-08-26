export {
  getCachedMagnificStockPhotoUrl,
  isMagnificStockImageUrl,
  downloadMagnificStockPhoto,
  searchMagnificStockPhoto,
  searchMagnificStockPhotos,
  type MagnificStockPhoto,
  type MagnificDownloadResult,
} from '@reservations/shared';

export function discoveryImageProxyUrl(term: string): string {
  return `/api/discovery-image?term=${encodeURIComponent(term.trim())}`;
}
