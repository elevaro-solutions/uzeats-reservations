import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { Providers } from '@/lib/apollo';
import { DashShell } from '@/components/DashShell';
import { brandAssetPaths, PaletteStyles } from '@reservations/ui';
import './globals.css';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tablevera Partner Hub',
  description: 'Restaurant and admin dashboard',
  icons: {
    icon: [{ url: brandAssetPaths.icon, type: 'image/svg+xml' }],
    apple: [{ url: '/brand/apple-touch-icon.png', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html component="RootLayout" lang="en" className={sans.variable}>
      <head>
        <PaletteStyles />
      </head>
      <body>
        <AntdRegistry>
          <Providers>
            <DashShell>{children}</DashShell>
          </Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
