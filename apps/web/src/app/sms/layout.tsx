import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SMS Messaging Terms & Opt-In — Tablevera',
  description:
    'How Tablevera uses SMS text messages, how you opt in and opt out, message types, and sample messages.',
};

export default function SmsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
