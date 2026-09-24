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
