import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { FOR_RESTAURANTS_FAQ } from '@/lib/partnerMarketing';
import { DEFAULT_OG_IMAGE_PATH, absoluteUrl, defaultOgImages, faqJsonLd } from '@/lib/seo';

const TITLE = 'Restaurant Reservation System for Small Restaurants | Tablevera';
const DESCRIPTION =
  'OpenTable alternative for small restaurants: free listing with reservations, a booking widget for your website, and a 30-day trial on paid plans.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/for-restaurants' },
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl('/for-restaurants'),
    siteName: 'Tablevera',
    images: defaultOgImages(TITLE),
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
  },
};

export default function ForRestaurantsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={faqJsonLd(FOR_RESTAURANTS_FAQ)} />
      {children}
    </>
  );
}
