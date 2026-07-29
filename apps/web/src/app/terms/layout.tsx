import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Tablevera',
  description: 'Terms and conditions for using Tablevera to discover restaurants and book tables.',
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
