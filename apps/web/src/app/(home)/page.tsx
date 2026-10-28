import { JsonLd } from '@/components/JsonLd';
import { fetchHomeSearchSeed } from '@/lib/homeSearchSeed';
import { buildRestaurantBookingPath } from '@reservations/shared';
import {
  HOME_FAQ,
  faqJsonLd,
  itemListJsonLd,
} from '@/lib/seo';
import HomePageClient from './HomePageClient';

export default async function HomePage() {
  const initialSearch = await fetchHomeSearchSeed();
  const listItems =
    initialSearch?.items
      .filter((item) => item.slug || item.id)
      .slice(0, 20)
      .map((item) => ({
        name: item.name,
        url: buildRestaurantBookingPath(item.slug, item.id),
      })) ?? [];

  return (
    <>
      <JsonLd
        data={[
          faqJsonLd(HOME_FAQ),
          ...(listItems.length
            ? [
                itemListJsonLd({
                  name: 'Restaurants you can book on Tablevera',
                  description:
                    'Live restaurant listings with neighbourhood and cuisine search and instant confirmation.',
                  url: '/',
                  items: listItems,
                }),
              ]
            : []),
        ]}
      />
      <HomePageClient initialSearch={initialSearch} />
    </>
  );
}
