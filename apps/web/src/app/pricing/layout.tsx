import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Restaurant Pricing Plans — Tablevera',
  description:
    'Compare Tablevera plans for restaurants. Online reservations, guest messaging, and tools to fill more tables.',
  alternates: { canonical: '/pricing' },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
