import Link from 'next/link';
import type { DiscoveryLandingMeta } from '@reservations/shared';
import type { BreadcrumbItem } from '@/lib/seo';

type RestaurantLink = { name: string; url: string };

type Props = {
  meta: DiscoveryLandingMeta;
  breadcrumbs: BreadcrumbItem[];
  relatedLinks?: Array<{ href: string; label: string }>;
  restaurants: RestaurantLink[];
};

/** Server-rendered copy so crawlers and answer engines see H1, FAQs, and named venues. */
export function DiscoveryLandingChrome({
  meta,
  breadcrumbs,
  relatedLinks = [],
  restaurants,
}: Props) {
  return (
    <div className="rt-discovery-seo">
      {breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="rt-discovery-seo__crumbs">
          <ol>
            {breadcrumbs.map((item, index) => (
              <li key={`${item.name}-${index}`}>
                {item.href && index < breadcrumbs.length - 1 ? (
                  <Link href={item.href}>{item.name}</Link>
                ) : (
                  <span>{item.name}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <h1>{meta.heading}</h1>
      {meta.intro ? <p className="rt-discovery-seo__intro">{meta.intro}</p> : null}

      {restaurants.length > 0 ? (
        <section aria-label="Restaurants on this page">
          <h2>Restaurants you can book</h2>
          <ol className="rt-discovery-seo__list">
            {restaurants.map((restaurant) => (
              <li key={restaurant.url}>
                <Link href={restaurant.url}>{restaurant.name}</Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="rt-discovery-landing__footer">
        {relatedLinks.length > 0 ? (
          <section>
            <h2>Explore more</h2>
            <ul className="rt-discovery-seo__related">
              {relatedLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {meta.faq.length > 0 ? (
          <section>
            <h2>Frequently asked questions</h2>
            {meta.faq.map((item) => (
              <div key={item.question} className="rt-discovery-seo__faq">
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
