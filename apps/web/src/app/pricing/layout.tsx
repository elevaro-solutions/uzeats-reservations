import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { PRICING_FAQ } from '@/lib/partnerMarketing';
import { DEFAULT_OG_IMAGE_PATH, absoluteUrl, defaultOgImages, faqJsonLd } from '@/lib/seo';

const TITLE = 'Tablevera Pricing — Free Base Listing, Core $99/mo, Pro $199/mo';
const DESCRIPTION =
  'Compare Tablevera restaurant plans: free Base listing, Core $99/mo, and Pro $199/mo. Paid plans include a 30-day trial. Website reservations are free on Core and Pro.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/pricing' },
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl('/pricing'),
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

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={faqJsonLd(PRICING_FAQ)} />
      {children}
    </>
  );
}
