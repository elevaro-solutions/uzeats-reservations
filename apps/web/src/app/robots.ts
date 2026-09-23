import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/login',
        '/register',
        '/profile',
        '/reservations',
        '/reviews',
        '/messages/',
        '/saved',
        '/waitlist',
        '/forgot-password',
        '/reset-password',
        '/accept-invite',
        '/survey/',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
