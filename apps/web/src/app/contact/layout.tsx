import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Tablevera',
  description: 'Get in touch with Tablevera for diner support, partnership questions, or restaurant onboarding.',
  alternates: { canonical: '/contact' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
