import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Restaurants — Tablevera',
  description:
    'Get discovered by diners, fill more tables, and cut no-shows. Register your restaurant on Tablevera and start a free trial.',
  alternates: { canonical: '/for-restaurants' },
};

export default function ForRestaurantsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
