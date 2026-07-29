import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy — Tablevera',
  description: 'Learn about cookies and similar technologies used on Tablevera and how to manage your preferences.',
};

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
