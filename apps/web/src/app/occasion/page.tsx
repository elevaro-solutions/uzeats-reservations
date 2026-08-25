import type { Metadata } from 'next';
import { seoOccasionLinkLabel, seoOccasionLinkParts } from '@reservations/shared';
import { JsonLd } from '@/components/JsonLd';
import { DiscoveryIndexRowList } from '@/components/DiscoveryIndexRowList';
import {
  occasionIndexDescription,
  occasionIndexImageAlt,
  occasionIndexImageSrc,
} from '@/lib/discoveryIndexContent';
import { listOccasionsForIndex } from '@/lib/discoveryIndex';
import { breadcrumbJsonLd, discoveryLandingMetadata, itemListJsonLd } from '@/lib/seo';

const PAGE_DESCRIPTION =
  'Find restaurants for date night, birthdays, business meals, group dining, and more. Book with live availability on Tablevera.';

export const metadata: Metadata = discoveryLandingMetadata({
  title: 'Restaurants by Occasion — Reserve a Table | Tablevera',
  description: PAGE_DESCRIPTION,
  canonicalPath: '/occasion',
});

export default async function OccasionIndexPage() {
  const occasions = await listOccasionsForIndex();
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Occasions' },
  ];
  const items = occasions.map((occasion) => ({
    name: seoOccasionLinkLabel(occasion.label),
    url: `/occasion/${occasion.slug}`,
  }));

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px 72px' }}>
      <JsonLd
        data={[
          breadcrumbJsonLd(breadcrumbs),
          itemListJsonLd({
            name: 'Restaurants by Occasion',
            description: PAGE_DESCRIPTION,
            url: '/occasion',
            items,
          }),
        ]}
      />
      <h1 style={{ marginBottom: 8, fontSize: 32, fontWeight: 700, lineHeight: 1.25 }}>
        Restaurants by occasion
      </h1>
      <p style={{ marginBottom: 32, fontSize: 16, color: 'rgba(0,0,0,0.45)' }}>
        Match the mood — then reserve a table with live availability.
      </p>
      <DiscoveryIndexRowList
        items={occasions.map((occasion) => ({
          slug: occasion.slug,
          href: `/occasion/${occasion.slug}`,
          labelParts: seoOccasionLinkParts(occasion.label),
          description: occasionIndexDescription(
            occasion.slug,
            occasion.label,
            occasion.description,
          ),
          imageSrc: occasionIndexImageSrc(
            occasion.slug,
            occasion.label,
            occasion.imageUrl,
          ),
          imageAlt: occasionIndexImageAlt(occasion.label),
          count: occasion.count,
        }))}
      />
    </div>
  );
}
