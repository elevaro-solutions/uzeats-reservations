import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd, faqJsonLd, type BreadcrumbItem } from '@/lib/seo';

type Props = {
  breadcrumbs: BreadcrumbItem[];
  faq: Array<{ question: string; answer: string }>;
};

/** Server-rendered FAQ + breadcrumb schema for discovery landings. */
export function DiscoveryLandingSchema({ breadcrumbs, faq }: Props) {
  return <JsonLd data={[breadcrumbJsonLd(breadcrumbs), faqJsonLd(faq)]} />;
}
