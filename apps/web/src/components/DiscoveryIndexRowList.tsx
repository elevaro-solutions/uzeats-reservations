import Link from 'next/link';
import type { SeoLinkLabelParts } from '@reservations/shared';
import { SeoDiscoveryLinkLabel } from '@/components/SeoDiscoveryLinkLabel';

export type DiscoveryIndexRowItem = {
  slug: string;
  href: string;
  labelParts: SeoLinkLabelParts;
  description: string;
  imageSrc: string;
  imageAlt: string;
  count?: number;
};

export function DiscoveryIndexRowList({ items }: { items: DiscoveryIndexRowItem[] }) {
  return (
    <ul className="rt-discovery-index-list">
      {items.map((item) => (
        <li key={item.slug}>
          <Link href={item.href} className="rt-discovery-index-row">
            <img
              src={item.imageSrc}
              alt={item.imageAlt}
              className="rt-discovery-index-row__image"
              loading="lazy"
            />
            <div className="rt-discovery-index-row__body">
              <span className="rt-discovery-index-row__title">
                <SeoDiscoveryLinkLabel parts={item.labelParts} />
              </span>
              <p className="rt-discovery-index-row__desc">{item.description}</p>
              {typeof item.count === 'number' ? (
                <span className="rt-discovery-index-row__meta">
                  {item.count} restaurant{item.count === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
