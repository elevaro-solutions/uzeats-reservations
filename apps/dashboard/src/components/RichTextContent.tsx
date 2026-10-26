'use client';

import { sanitizeBlogHtml } from '@reservations/shared';
import { looksLikeRichHtml } from './RichTextArea';

export function RichTextContent({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!looksLikeRichHtml(text)) {
    return (
      <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
        {text}
      </span>
    );
  }

  const safe = sanitizeBlogHtml(text);
  return (
    <span
      className={`rt-rich-content${className ? ` ${className}` : ''}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
