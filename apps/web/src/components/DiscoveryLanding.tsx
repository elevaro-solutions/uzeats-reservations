import { notFound } from 'next/navigation';
import { buildRestaurantBookingPath, type DiscoveryLandingMeta } from '@reservations/shared';
import { DiscoveryLandingChrome } from '@/components/DiscoveryLandingChrome';
import { DiscoveryLandingSchema } from '@/components/DiscoveryLandingSchema';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import {
  fetchDiscoveryLandingSeed,
  type DiscoverySearchPreset,
} from '@/lib/discoveryLandingSeed';
import type { BreadcrumbItem } from '@/lib/seo';

type Props = {
  meta: DiscoveryLandingMeta;
  breadcrumbs: BreadcrumbItem[];
  canonicalPath: string;
  preset: DiscoverySearchPreset;
  relatedLinks?: Array<{ href: string; label: string }>;
  placeLabel?: string;
  /** 404 when this location-specific hub has no listed restaurants. */
  requireInventory?: boolean;
};

export async function DiscoveryLanding({
  meta,
  breadcrumbs,
  canonicalPath,
  preset,
  relatedLinks = [],
  placeLabel,
  requireInventory = false,
}: Props) {
  const seed = await fetchDiscoveryLandingSeed(preset);
  if (requireInventory && (seed?.total ?? 0) === 0) notFound();

  const restaurants = (seed?.items ?? [])
    .filter((item) => item.slug || item.id)
    .map((item) => ({
      name: item.name,
      url: buildRestaurantBookingPath(item.slug, item.id),
    }));

  return (
    <div className="rt-discovery-page">
      <DiscoveryLandingSchema
        breadcrumbs={breadcrumbs}
        faq={meta.faq}
        canonicalPath={canonicalPath}
        heading={meta.heading}
        description={meta.description}
        placeLabel={placeLabel}
        restaurants={restaurants}
      />
      <DiscoveryLandingChrome
        meta={meta}
        breadcrumbs={breadcrumbs}
        relatedLinks={relatedLinks}
        restaurants={restaurants}
      />
      <DiscoveryLandingView
        meta={meta}
        canonicalPath={canonicalPath}
        preset={preset}
        breadcrumbs={breadcrumbs}
        relatedLinks={relatedLinks}
        initialSearch={seed}
        hideSeoChrome
      />
    </div>
  );
}
