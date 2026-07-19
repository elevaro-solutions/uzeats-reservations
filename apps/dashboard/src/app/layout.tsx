import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { Providers } from '@/lib/apollo';
import { DashShell } from '@/components/DashShell';
import './globals.css';

const sans = Plus_Jakarta_Sans({
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
    <html lang="en" className={sans.variable}>
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
