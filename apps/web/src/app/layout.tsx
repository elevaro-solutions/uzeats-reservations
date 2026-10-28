import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { Providers } from '@/lib/apollo';
import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { JsonLd } from '@/components/JsonLd';
import { PaletteStyles } from '@reservations/ui';
import {
  DEFAULT_OG_IMAGE_PATH,
  defaultOgImages,
  getSiteUrl,
  ORGANIZATION_LOGO_PATH,
  organizationJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from '@/lib/seo';
import './globals.css';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Tablevera — Find and Book Restaurants Near You',
  description:
    'Find restaurants by neighbourhood or cuisine and book a table with instant confirmation. Free for diners on Tablevera.',
  applicationName: 'Tablevera',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Tablevera',
    title: 'Tablevera — Find and Book Restaurants Near You',
    description:
      'Find restaurants by neighbourhood or cuisine and book a table with instant confirmation. Free for diners on Tablevera.',
    images: defaultOgImages(),
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tablevera — Find and Book Restaurants Near You',
    description:
      'Find restaurants by neighbourhood or cuisine and book a table with instant confirmation. Free for diners on Tablevera.',
    images: [`${siteUrl}${DEFAULT_OG_IMAGE_PATH}`],
  },
  icons: {
    icon: [
      { url: '/brand/tablevera_icon_v2.svg', type: 'image/svg+xml' },
      { url: ORGANIZATION_LOGO_PATH, type: 'image/png', sizes: '180x180' },
    ],
    apple: [{ url: ORGANIZATION_LOGO_PATH, type: 'image/png', sizes: '180x180' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html component="RootLayout" lang="en-US" className={sans.variable} suppressHydrationWarning>
      <head>
        <PaletteStyles />
      </head>
      <body suppressHydrationWarning style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
        <GoogleAnalytics />
        <JsonLd data={[organizationJsonLd(), websiteJsonLd(), softwareApplicationJsonLd()]} />
        <AntdRegistry>
          <Providers>
            <ErrorBoundary>
              <AppShell>{children}</AppShell>
            </ErrorBoundary>
          </Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
