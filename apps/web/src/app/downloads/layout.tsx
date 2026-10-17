import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Downloads & brand kit — Tablevera',
  description:
    'Download the Tablevera diner and partner apps for Android. iPhone apps are coming soon. Logos, app icons, and store graphics.',
  alternates: { canonical: '/downloads' },
};

export default function DownloadsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
