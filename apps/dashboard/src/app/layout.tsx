import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { Providers } from '@/lib/apollo';
import { DashShell } from '@/components/DashShell';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ReserveTable Partner Hub',
  description: 'Restaurant and admin dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
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
