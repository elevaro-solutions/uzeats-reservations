'use client';

import { sanitizeSupportHtml } from '@reservations/shared';

export function SupportHtml({ html }: { html: string }) {
  const safe = sanitizeSupportHtml(html);
  if (!safe) return null;
  return <div className="support-html" dangerouslySetInnerHTML={{ __html: safe }} />;
}
