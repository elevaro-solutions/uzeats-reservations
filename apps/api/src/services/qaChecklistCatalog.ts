export const QA_CHECKLIST_RELEASE = '0.92.0';

export type QaChecklistGate = 'required' | 'recommended';

export type QaChecklistCatalogItem = {
  id: string;
  gate: QaChecklistGate;
  group: string;
  label: string;
  /** How to verify this item. Shown beside the checkbox and in the steps panel. */
  steps: string[];
};

/** Release-delta items stored by id. Labels ship with the API so the saved row stays small. */
export const QA_CHECKLIST_CATALOG: QaChecklistCatalogItem[] = [
  {
    id: 'rel-pricing-public',
    gate: 'required',
    group: 'Pricing',
    label: 'Public /pricing shows a 3-up carousel, honest plan copy, and a compare table only when enabled',
    steps: [
      'Open diner web /pricing. Confirm at most 3 plan cards show at once (default). If more packages are listed, overlay arrows appear and move the carousel. Cards are equal height and Core is not scaled up.',
      'Confirm there are no package-name chips under the Monthly / Annual toggle. The FAQ accordion is as wide as the sections above it. The testimonial stars are filled gold, not outlined.',
      'Read the hero and plan copy: 30-day trial on paid plans only; website covers free on Core/Pro; Base/Basic website cover fees are called out.',
      'If Compare all features is visible: every visible package is a column (including Base and custom plans such as Unlimited), prices are in the header, and cells use a simple included / not-included mark. If the table is hidden, that is the default — continue with the Partner Hub settings item.',
    ],
  },
  {
    id: 'rel-pricing-settings',
    gate: 'required',
    group: 'Pricing',
    label: 'Plans & pricing can set how many packages show at once and whether Compare all features is on',
    steps: [
      'Sign in as a platform admin. Open Partner Hub Plans & pricing. Find Public pricing page: packages visible at once (default 3, range 1–6) and Show the Compare all features table (off by default).',
      'Set visible-at-once to 2, save, and reload diner /pricing. Confirm 2 cards show and arrows still reach the rest. Set it back to 3.',
      'Turn the compare-table checkbox on, save, and reload /pricing. Confirm Compare all features appears with every visible package. Turn it off and confirm the table is gone.',
    ],
  },
  {
    id: 'rel-about-nap',
    gate: 'required',
    group: 'About and brand',
    label: 'Diner /about lists Tablevera as a company in Sterling, VA (name, address, phone)',
    steps: [
      'Open diner web /about. Confirm it says Tablevera is a reservation platform, not a restaurant.',
      'In the Company section, confirm name Tablevera, address 20844 Waterbeach Place, Sterling, VA 20165, USA, and a phone number. Footer or header can also link here.',
    ],
  },
  {
    id: 'rel-widget-link',
    gate: 'required',
    group: 'Partner Hub',
    label: 'The booking-widget embed snippet includes a Book on Tablevera HTML link to the public listing',
    steps: [
      'Sign in as an owner. Open Grow / booking widget (share panel) and copy the website embed script.',
      'Confirm the snippet includes a <p> with an <a> labeled “Book on Tablevera” (or “Book {restaurant} on Tablevera”) pointing at the public /restaurants/{slug} listing. Partner Hub copy tells the owner to keep that link with the script.',
    ],
  },
  {
    id: 'rel-discovery-hubs',
    gate: 'required',
    group: 'Discovery',
    label: 'City and cuisine hubs use unique, server-rendered copy; empty location hubs 404',
    steps: [
      'Open city hubs for Key West, Miami Beach, Dania Beach, Fairfax, and Sterling. Confirm each intro is specific to that city (not a generic “restaurants in {city}” only). View source or disable JavaScript and confirm the heading, named restaurants, and FAQs are in the HTML.',
      'Open cuisine hubs for Uzbek and Central Asian. Confirm the intro names those cuisines (plov, kebabs, or Central Asian kitchens).',
      'Open a location-specific hub that has no listed restaurants (or a made-up city slug). Confirm a 404, not an empty list with a 200.',
    ],
  },
  {
    id: 'rel-homepage',
    gate: 'required',
    group: 'Discovery',
    label: 'Homepage hero is honest, links to hubs, and lists partners nationwide even without open slots',
    steps: [
      'Open diner home. Confirm the hero does not claim fake restaurant or diner counts. It links to city, cuisine, near-me, and restaurant-side (for-restaurants / pricing) hubs.',
      'Confirm listed restaurants are not limited to an empty NYC radius — partners from other cities still appear. A partner with no open slots still shows on the list.',
      'Check page titles/descriptions on home, a restaurant, a city hub, a cuisine hub, /pricing, and /for-restaurants. They follow search-oriented templates and include “Book a Table” where that template applies.',
    ],
  },
  {
    id: 'rel-app-banner',
    gate: 'required',
    group: 'Diner web',
    label: 'The mobile app download suggestion is a gold banner above the site header',
    steps: [
      'On a phone-width window (or device), open diner web. Confirm a gold App banner sits above the header, not under the nav. Android offers Google Play; iPhone/iPad says the app is coming soon.',
      'Dismiss it and reload. Confirm it stays dismissed. Desktop-width windows should not show it. /downloads does not show the banner on top of that page.',
    ],
  },
  {
    id: 'rel-redirects',
    gate: 'required',
    group: 'Discovery',
    label: '/contact-sales and /best-restaurants permanently redirect to the live pages',
    steps: [
      'Visit /contact-sales. Confirm a permanent redirect to /contact?topic=restaurant (contact sales form).',
      'Visit /best-restaurants. Confirm a permanent redirect to /top-restaurants (same 4.5+ list). Hub links and the sitemap should not advertise /best-restaurants as a separate page.',
    ],
  },
  {
    id: 'rel-crawlers',
    gate: 'required',
    group: 'SEO',
    label: 'Crawler files, account noindex, and default schema match the live catalog',
    steps: [
      'Open /llms.txt. Confirm it points at /about and live /restaurants/{slug} pages, and tells models not to invent empty New York coverage.',
      'Open /robots.txt. Confirm it disallows /billing, /verify-email, /invoice/, and /api/ (plus the existing account paths).',
      'Open /login and /profile (signed in). Confirm the HTML has noindex (robots meta) and the response has X-Robots-Tag: noindex, nofollow. Repeat mentally for /reservations and related account routes.',
      'View source on home: default Open Graph image, FAQ or ItemList schema. On /pricing and /for-restaurants: FAQ schema. Organization JSON-LD uses a PNG apple-touch-icon / logo, SoftwareApplication, and Play Store URLs in sameAs.',
      'Open /sitemap.xml. Confirm city/neighborhood hubs with live inventory are listed, and empty curated popular cities are not dumped in. /about and /pricing are present; /best-restaurants is not a separate sitemap URL.',
    ],
  },
  {
    id: 'rel-listing-seo',
    gate: 'required',
    group: 'SEO',
    label: 'Restaurant cards and listing pages are descriptive; unknown slugs 404; JSON-LD is complete',
    steps: [
      'On home or a city hub, inspect a restaurant card photo. Alt text includes the city (for example “Name, Sterling”), not only the restaurant name.',
      'Visit /restaurants/this-slug-does-not-exist. Confirm a 404, not an empty 200 stub.',
      'View source on a live restaurant page. JSON-LD includes acceptsReservations and a ReserveAction entry point. If the venue has no reviews, aggregateRating is omitted (not empty). If a menu URL exists, hasMenu is set.',
    ],
  },
];
