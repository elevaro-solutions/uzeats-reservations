import type { Metadata } from 'next';
import { DEFAULT_OG_IMAGE_PATH, absoluteUrl, defaultOgImages } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Tablevera — Find and Book Restaurants Near You',
  description:
    'Search restaurants by neighbourhood or cuisine and reserve with instant confirmation. Tablevera is free for diners.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    title: 'Tablevera — Find and Book Restaurants Near You',
    description:
      'Search restaurants by neighbourhood or cuisine and reserve with instant confirmation. Tablevera is free for diners.',
    url: absoluteUrl('/'),
    siteName: 'Tablevera',
    images: defaultOgImages(),
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tablevera — Find and Book Restaurants Near You',
    description:
      'Search restaurants by neighbourhood or cuisine and reserve with instant confirmation. Tablevera is free for diners.',
    images: [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
