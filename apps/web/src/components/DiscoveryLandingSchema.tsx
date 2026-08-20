import { JsonLd } from '@/components/JsonLd';
import {
  breadcrumbJsonLd,
  faqJsonLd,
  howToBookJsonLd,
  webPageJsonLd,
  type BreadcrumbItem,
} from '@/lib/seo';

type Props = {
  breadcrumbs: BreadcrumbItem[];
  faq: Array<{ question: string; answer: string }>;
  /** Canonical path for WebPage / HowTo schema. */
  canonicalPath?: string;
  /** Page heading used in WebPage + HowTo name. */
  heading?: string;
  description?: string;
  /** Optional place label for HowTo (e.g. "New York, NY"). */
  placeLabel?: string;
};

/** Server-rendered FAQ + breadcrumb (+ optional WebPage/HowTo) schema for discovery landings. */
export function DiscoveryLandingSchema({
  breadcrumbs,
  faq,
  canonicalPath,
  heading,
  description,
  placeLabel,
}: Props) {
  const blocks: Record<string, unknown>[] = [breadcrumbJsonLd(breadcrumbs), faqJsonLd(faq)];
  if (canonicalPath && heading && description) {
    blocks.push(
      webPageJsonLd({ name: heading, description, url: canonicalPath }),
      howToBookJsonLd(placeLabel),
    );
  }
  return <JsonLd data={blocks} />;
}
