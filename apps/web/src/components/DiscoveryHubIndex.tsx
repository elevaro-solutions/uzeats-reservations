import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd, webPageJsonLd } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';

export type DiscoveryHubSection = {
  heading: string;
  links: Array<{ href: string; label: string; count?: number }>;
};

type DiscoveryHubIndexProps = {
  title: string;
  description: string;
  intro: string;
  canonicalPath: string;
  breadcrumbs: BreadcrumbItem[];
  sections: DiscoveryHubSection[];
  /** Flat ItemList entries for JSON-LD (defaults to all section links). */
  schemaItems?: Array<{ name: string; url: string }>;
  faq?: Array<{ question: string; answer: string }>;
};

export function DiscoveryHubIndex({
  title,
  description,
  intro,
  canonicalPath,
  breadcrumbs,
  sections,
  schemaItems,
  faq = [],
}: DiscoveryHubIndexProps) {
  const items =
    schemaItems ??
    sections.flatMap((section) =>
      section.links.map((link) => ({ name: link.label, url: link.href })),
    );

  const schema: Record<string, unknown>[] = [
    breadcrumbJsonLd(breadcrumbs),
    itemListJsonLd({
      name: title,
      description,
      url: canonicalPath,
      items,
    }),
    webPageJsonLd({ name: title, description, url: canonicalPath }),
  ];
  if (faq.length) schema.push(faqJsonLd(faq));

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px 72px' }}>
      <JsonLd data={schema} />
      <h1 style={{ marginBottom: 8, fontSize: 32, fontWeight: 700, lineHeight: 1.25 }}>{title}</h1>
      <p style={{ marginBottom: 32, fontSize: 16, color: 'rgba(0,0,0,0.45)' }}>{intro}</p>
      {sections.map((section) => (
        <section key={section.heading} style={{ marginBottom: 40 }}>
          <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>{section.heading}</h2>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            }}
          >
            {section.links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} style={{ fontSize: 16 }}>
                  {link.label}
                  {typeof link.count === 'number' ? (
                    <span style={{ marginLeft: 8, fontSize: 14, color: 'rgba(0,0,0,0.45)' }}>
                      ({link.count})
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {faq.length > 0 ? (
        <section style={{ marginTop: 16 }}>
          <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>
            Frequently asked questions
          </h2>
          {faq.map((item) => (
            <div key={item.question} style={{ marginBottom: 20 }}>
              <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{item.question}</p>
              <p style={{ margin: 0, color: 'rgba(0,0,0,0.45)' }}>{item.answer}</p>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
