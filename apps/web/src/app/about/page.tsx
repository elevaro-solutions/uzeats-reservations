import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import {
  COMPANY_ADDRESS_DISPLAY,
  COMPANY_NAME,
  COMPANY_PHONE,
  COMPANY_PHONE_DISPLAY,
  SUPPORT_EMAIL,
} from '@/lib/legal';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  defaultOgImages,
  webPageJsonLd,
} from '@/lib/seo';

const TITLE = 'About Tablevera — Find and Book Restaurants';
const DESCRIPTION =
  'Tablevera is a restaurant reservation platform for diners and independent restaurants. Search by city or cuisine, book with instant confirmation, or list your venue.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/about' },
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl('/about'),
    siteName: 'Tablevera',
    images: defaultOgImages(TITLE),
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [absoluteUrl('/images/hero-restaurant.jpg')],
  },
};

export default function AboutPage() {
  return (
    <article className="about-page">
      <JsonLd
        data={[
          webPageJsonLd({
            name: 'About Tablevera',
            description: DESCRIPTION,
            url: '/about',
          }),
          breadcrumbJsonLd([
            { name: 'Home', href: '/' },
            { name: 'About' },
          ]),
        ]}
      />

      <header className="about-page__hero">
        <p className="about-page__badge">About</p>
        <h1>Tablevera helps diners find a table — and restaurants fill it.</h1>
        <p>
          We are a reservation platform, not a restaurant. Diners search by neighbourhood or
          cuisine and confirm a table in seconds. Independent restaurants get a public listing, a
          booking widget for their own website, and a host dashboard — without an annual contract.
        </p>
      </header>

      <section className="about-page__grid">
        <div>
          <h2>For diners</h2>
          <p>
            Browse live availability, filter by city, cuisine, price, and occasion, and book with
            instant confirmation. Reservations are free for diners. If a restaurant asks for a
            deposit, you see the amount before you confirm, and it is applied to your bill.
          </p>
          <p>
            Start on the homepage, or jump to{' '}
            <Link href="/cities">restaurants by city</Link> and{' '}
            <Link href="/cuisine">cuisine hubs</Link> such as Uzbek, Italian, and Mediterranean.
          </p>
        </div>
        <div>
          <h2>For restaurants</h2>
          <p>
            Tablevera is a reservation system for small restaurants: a free Base listing, Core and
            Pro tools for the floor, and a website booking widget. You pay network cover fees only
            when guests who found you on Tablevera are seated.
          </p>
          <p>
            See <Link href="/for-restaurants">how it works</Link> or compare{' '}
            <Link href="/pricing">plans and cover fees</Link>.
          </p>
        </div>
      </section>

      <section className="about-page__nap">
        <h2>Company</h2>
        <p>
          {COMPANY_NAME} is based in Sterling, Virginia. Use the same name, address, and phone
          everywhere you list us so diners and search engines can tell Tablevera apart from
          similarly named restaurants.
        </p>
        <dl>
          <div>
            <dt>Name</dt>
            <dd>{COMPANY_NAME}</dd>
          </div>
          <div>
            <dt>Address</dt>
            <dd>{COMPANY_ADDRESS_DISPLAY}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>
              <a href={`tel:${COMPANY_PHONE}`}>{COMPANY_PHONE_DISPLAY}</a>
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </dd>
          </div>
          <div>
            <dt>Website</dt>
            <dd>
              <a href="https://tablevera.online">tablevera.online</a>
            </dd>
          </div>
        </dl>
        <p>
          Questions? <Link href="/contact">Contact us</Link> or write to restaurants at{' '}
          <Link href="/contact?topic=restaurant">contact sales</Link>.
        </p>
      </section>
    </article>
  );
}
