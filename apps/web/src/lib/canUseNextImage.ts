import { toSpacesCdnUrl } from '@reservations/shared';

/** Hosts allowlisted in apps/web/next.config.mjs `images.remotePatterns`. */

export function canUseNextImage(src: string): boolean {
  try {
    const { protocol, hostname } = new URL(src);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return (
      hostname === 'picsum.photos' ||
      hostname === 'images.unsplash.com' ||
      hostname === 'img.freepik.com' ||
      hostname === 'img.b2bpic.net' ||
      hostname.endsWith('.freepik.com') ||
      hostname.endsWith('.digitaloceanspaces.com')
    );
  } catch {
    return false;
  }
}

/** Spaces images load from the DigitalOcean CDN, not the Next image optimizer. */
export function spacesImageProps(src: string): { src: string; unoptimized: boolean } {
  const cdnSrc = toSpacesCdnUrl(src);
  try {
    return {
      src: cdnSrc,
      unoptimized: new URL(cdnSrc).hostname.endsWith('.digitaloceanspaces.com'),
    };
  } catch {
    return { src: cdnSrc, unoptimized: false };
  }
}
