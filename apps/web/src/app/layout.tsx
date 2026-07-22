import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { Providers } from '@/lib/apollo';
import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PaletteStyles } from '@reservations/ui';
import './globals.css';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Tablevera — Find and book restaurants',
  description: 'Discover restaurants and reserve tables across the USA in seconds.',
  icons: {
    icon: [{ url: '/brand/tablevera_icon_v2.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/brand/tablevera_icon_v2.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html component="RootLayout" lang="en" className={sans.variable}>
      <head>
        <PaletteStyles />
      </head>
      <body style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
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
