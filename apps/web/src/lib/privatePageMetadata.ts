import type { Metadata } from 'next';

/** Account and booking-management routes must not inherit homepage metadata. */
export const privatePageMetadata: Metadata = {
  title: 'Account — Tablevera',
  robots: { index: false, follow: false },
};
