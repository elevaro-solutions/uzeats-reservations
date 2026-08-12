import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tablevera — Find and book restaurants',
  description: 'Discover restaurants and reserve tables across the USA in seconds.',
  alternates: { canonical: '/' },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
