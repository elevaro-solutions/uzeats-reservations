import type { SeoLinkLabelParts } from '@reservations/shared';

export function SeoDiscoveryLinkLabel({ parts }: { parts: SeoLinkLabelParts }) {
  return (
    <>
      {parts.before}
      <strong>{parts.highlight}</strong>
      {parts.after}
    </>
  );
}
