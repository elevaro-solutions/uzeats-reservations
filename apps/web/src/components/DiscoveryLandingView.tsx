'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dayjs from 'dayjs';
import { Col, Pagination, Row, Segmented, Skeleton, Typography } from 'antd';
import { EnvironmentFilled, GlobalOutlined, SearchOutlined } from '@ant-design/icons';
import {
  buildRestaurantBookingPath,
  cuisineSlug,
  discoverySlug,
  type DiscoveryLandingMeta,
} from '@reservations/shared';
import { RestaurantCard, EmptyState, layout, typography } from '@reservations/ui';
import { SEARCH_RESTAURANTS, AVAILABILITY } from '@/lib/graphql';
import { useUrlPagination } from '@/lib/useUrlPagination';
import { useDiscoveryViewMode } from '@/lib/useDiscoveryViewMode';
import { DEFAULT_LOCATION, cityLabel } from '@/lib/cities';
import type { LocationSelection } from '@/components/AddressAutocomplete';
import { MapResultsLayout } from '@/components/MapResultsLayout';
import { DiscoverySearchPanel } from '@/components/DiscoverySearchPanel';
import { MapFiltersSidebar } from '@/components/MapFiltersSidebar';
import { DiscoveryBreadcrumbs } from '@/components/DiscoveryBreadcrumbs';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';

const { Title, Paragraph, Text } = Typography;
const NEARBY_RADIUS_KM = 16;

export type DiscoverySearchPreset = {
  cuisine?: string;
  city?: string;
  neighborhood?: string;
  occasion?: string;
  diningStyle?: string;
  meal?: string;
  dietary?: string;
  amenity?: string;
  lat?: number;
  lng?: number;
  locationLabel?: string;
};

type DiscoveryLandingViewProps = {
  meta: DiscoveryLandingMeta;
  breadcrumbs: BreadcrumbItem[];
  canonicalPath: string;
  preset: DiscoverySearchPreset;
  relatedLinks?: Array<{ href: string; label: string }>;
};

function DiscoveryLandingContent({
  meta,
  breadcrumbs,
  canonicalPath,
  preset,
  relatedLinks = [],
}: DiscoveryLandingViewProps) {
  const router = useRouter();
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState(dayjs().add(1, 'day'));
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [locationInput, setLocationInput] = useState(
    preset.locationLabel ?? (preset.city ? `${preset.city}` : cityLabel(DEFAULT_LOCATION)),
  );
  const [selectedLocation, setSelectedLocation] = useState<LocationSelection>({
    label: preset.locationLabel ?? cityLabel(DEFAULT_LOCATION),
    lat: preset.lat ?? DEFAULT_LOCATION.lat,
    lng: preset.lng ?? DEFAULT_LOCATION.lng,
  });
  const [usingDeviceLocation, setUsingDeviceLocation] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [mapPriceRange, setMapPriceRange] = useState<number | undefined>();
  const [topRatedOnly, setTopRatedOnly] = useState(false);
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [occasions, setOccasions] = useState<string[]>(preset.occasion ? [preset.occasion] : []);
  const [diningStyles, setDiningStyles] = useState<string[]>(preset.diningStyle ? [preset.diningStyle] : []);
  const [meals, setMeals] = useState<string[]>(preset.meal ? [preset.meal] : []);
  const [dietaryTags, setDietaryTags] = useState<string[]>(preset.dietary ? [preset.dietary] : []);
  const [amenities, setAmenities] = useState<string[]>(preset.amenity ? [preset.amenity] : []);
  const { viewMode, setViewMode } = useDiscoveryViewMode();
  const [selectedMapRestaurantId, setSelectedMapRestaurantId] = useState<string | null>(null);
  const { page, pageSize, setPage } = useUrlPagination({ defaultPageSize: 24 });
  const skipPageReset = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (skipPageReset.current) {
      skipPageReset.current = false;
      return;
    }
    setPage(1);
  }, [debouncedQuery, selectedLocation.lat, selectedLocation.lng, partySize, date, mapPriceRange, topRatedOnly, accessibleOnly, occasions, diningStyles, meals, dietaryTags, amenities, setPage]);

  const dateStr = date.format('YYYY-MM-DD');

  const { data, loading } = useQuery(SEARCH_RESTAURANTS, {
    variables: {
      input: {
        query: debouncedQuery || undefined,
        cuisine: preset.cuisine,
        city: preset.city,
        neighborhood: preset.neighborhood,
        occasions: occasions.length ? occasions : undefined,
        diningStyles: diningStyles.length ? diningStyles : undefined,
        meals: meals.length ? meals : undefined,
        dietaryTags: dietaryTags.length ? dietaryTags : undefined,
        amenities: amenities.length ? amenities : undefined,
        priceRange: mapPriceRange,
        minRating: topRatedOnly ? 4.5 : undefined,
        wheelchairAccessible: accessibleOnly || undefined,
        partySize,
        date: dateStr,
        requireAvailability: true,
        page,
        limit: pageSize,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        radiusKm: NEARBY_RADIUS_KM,
      },
    },
  });

  const restaurants = (data as any)?.searchRestaurants?.items ?? [];
  const total = (data as any)?.searchRestaurants?.total ?? 0;

  const schemaBlocks = useMemo(() => {
    const items = restaurants.map((r: any) => ({
      name: r.name,
      url: buildRestaurantBookingPath(r.slug, r.id),
    }));
    return [
      breadcrumbJsonLd(breadcrumbs),
      faqJsonLd(meta.faq),
      ...(items.length
        ? [
            itemListJsonLd({
              name: meta.heading,
              description: meta.description,
              url: canonicalPath,
              items,
            }),
          ]
        : []),
    ];
  }, [breadcrumbs, meta, restaurants, canonicalPath]);

  const clearFilters = useCallback(() => {
    setMapPriceRange(undefined);
    setTopRatedOnly(false);
    setAccessibleOnly(false);
    setOccasions(preset.occasion ? [preset.occasion] : []);
    setDiningStyles(preset.diningStyle ? [preset.diningStyle] : []);
    setMeals(preset.meal ? [preset.meal] : []);
    setDietaryTags(preset.dietary ? [preset.dietary] : []);
    setAmenities(preset.amenity ? [preset.amenity] : []);
    setQuery('');
    setDebouncedQuery('');
  }, [preset]);

  const mapFiltersSidebar = (
    <MapFiltersSidebar
      categories={[]}
      filters={{
        categoryIds: [],
        priceRange: mapPriceRange,
        occasions,
        diningStyles,
        meals,
        dietaryTags,
        amenities,
        topRatedOnly,
        accessibleOnly,
      }}
      onCategoryIdsChange={() => {}}
      onPriceRangeChange={setMapPriceRange}
      onOccasionsChange={setOccasions}
      onDiningStylesChange={setDiningStyles}
      onMealsChange={setMeals}
      onDietaryTagsChange={setDietaryTags}
      onAmenitiesChange={setAmenities}
      onTopRatedChange={setTopRatedOnly}
      onAccessibleChange={setAccessibleOnly}
      onClearAll={clearFilters}
    />
  );

  return (
    <div className="rt-discovery-landing" style={{ maxWidth: layout.contentMaxWidth, margin: '0 auto', padding: '24px' }}>
      <JsonLd data={schemaBlocks} />
      <DiscoveryBreadcrumbs items={breadcrumbs} />
      <Title level={1} style={{ marginTop: 0 }}>
        {meta.heading}
      </Title>
      <Paragraph type="secondary" style={{ fontSize: typography.fontSize.md, maxWidth: 720 }}>
        {meta.intro}
      </Paragraph>

      <DiscoverySearchPanel
        variant="map"
        query={query}
        cuisine={preset.cuisine}
        locationInput={locationInput}
        usingDeviceLocation={usingDeviceLocation}
        partySize={partySize}
        date={date}
        geoLoading={geoLoading}
        datePresets={[
          { label: 'Today', value: dayjs() },
          { label: 'Tomorrow', value: dayjs().add(1, 'day') },
        ]}
        onQueryChange={setQuery}
        onCuisineChange={() => {}}
        onLocationInputChange={setLocationInput}
        onSelectLocation={(loc) => {
          setSelectedLocation(loc);
          setLocationInput(loc.label);
          setUsingDeviceLocation(false);
        }}
        onUseMyLocation={() => {
          if (!navigator.geolocation) return;
          setGeoLoading(true);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setSelectedLocation({ label: 'Near me', lat: pos.coords.latitude, lng: pos.coords.longitude });
              setLocationInput('Near me');
              setUsingDeviceLocation(true);
              setGeoLoading(false);
            },
            () => setGeoLoading(false),
          );
        }}
        onClearLocation={() => {
          setLocationInput(cityLabel(DEFAULT_LOCATION));
          setSelectedLocation({ label: cityLabel(DEFAULT_LOCATION), lat: DEFAULT_LOCATION.lat, lng: DEFAULT_LOCATION.lng });
          setUsingDeviceLocation(false);
        }}
        onClearDeviceLocation={() => setUsingDeviceLocation(false)}
        onDateChange={setDate}
        onPartySizeChange={setPartySize}
        onSearch={() => setDebouncedQuery(query)}
        onClearCategory={() => {}}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '16px 0' }}>
        <Segmented
          value={viewMode}
          onChange={(v) => setViewMode(v as 'list' | 'map')}
          options={[
            { label: 'Cards', value: 'list' },
            { label: 'Map', value: 'map', icon: <GlobalOutlined /> },
          ]}
        />
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : restaurants.length === 0 ? (
        <EmptyState
          icon={<SearchOutlined />}
          title="No matching restaurants with open tables"
          description="Try adjusting filters, date, or expanding your search area."
        />
      ) : viewMode === 'map' ? (
        <MapResultsLayout
          restaurants={restaurants}
          center={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
          selectedId={selectedMapRestaurantId}
          date={dateStr}
          partySize={partySize}
          total={total}
          page={page}
          pageSize={pageSize}
          resultsTitle={meta.heading}
          filtersSidebar={mapFiltersSidebar}
          onPageChange={setPage}
          onSelectRestaurant={setSelectedMapRestaurantId}
          onCloseRestaurant={() => setSelectedMapRestaurantId(null)}
          onOpenRestaurant={(id) => {
            const r = restaurants.find((item: any) => item.id === id);
            if (r) router.push(buildRestaurantBookingPath(r.slug, r.id));
          }}
          onSelectSlot={(id, time) => {
            const r = restaurants.find((item: any) => item.id === id);
            if (r) {
              router.push(
                `${buildRestaurantBookingPath(r.slug, r.id)}?date=${dateStr}&party=${partySize}&slot=${encodeURIComponent(time)}`,
              );
            }
          }}
          onClearCategory={clearFilters}
        />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <EnvironmentFilled />
            <Text strong>
              {total} restaurant{total === 1 ? '' : 's'} with availability
            </Text>
          </div>
          <Row gutter={[20, 20]}>
            {restaurants.map((r: any) => (
              <Col key={r.id} xs={24} sm={12} md={8} lg={6}>
                <RestaurantWithSlots
                  restaurant={r}
                  date={dateStr}
                  partySize={partySize}
                  onOpen={() => router.push(buildRestaurantBookingPath(r.slug, r.id))}
                  onSelectSlot={(time) =>
                    router.push(
                      `${buildRestaurantBookingPath(r.slug, r.id)}?date=${dateStr}&party=${partySize}&slot=${encodeURIComponent(time)}`,
                    )
                  }
                />
              </Col>
            ))}
          </Row>
          {total > pageSize && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
              <Pagination current={page} pageSize={pageSize} total={total} onChange={setPage} showSizeChanger={false} />
            </div>
          )}
        </>
      )}

      {relatedLinks.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <Title level={3}>Explore more</Title>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {relatedLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rt-chip">
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 48 }}>
        <Title level={3}>Frequently asked questions</Title>
        {meta.faq.map((item) => (
          <div key={item.question} style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              {item.question}
            </Text>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {item.answer}
            </Paragraph>
          </div>
        ))}
      </section>
    </div>
  );
}

function RestaurantWithSlots({
  restaurant,
  date,
  partySize,
  onOpen,
  onSelectSlot,
}: {
  restaurant: any;
  date: string;
  partySize: number;
  onOpen: () => void;
  onSelectSlot: (time: string) => void;
}) {
  const { data } = useQuery(AVAILABILITY, {
    variables: { restaurantId: restaurant.id, date, partySize },
  });
  const slots = useMemo(
    () =>
      ((data as any)?.availability ?? [])
        .filter((s: any) => s.available)
        .slice(0, 4)
        .map((s: any) => s.time),
    [data],
  );

  return (
    <RestaurantCard
      id={restaurant.id}
      name={restaurant.name}
      cuisine={restaurant.cuisine}
      priceRange={restaurant.priceRange}
      city={restaurant.address.city}
      state={restaurant.address.state}
      rating={restaurant.averageRating}
      reviewCount={restaurant.reviewCount}
      photoUrl={restaurant.photos?.[0]}
      availableSlots={slots}
      onClick={onOpen}
      onSelectSlot={(_, time) => onSelectSlot(time)}
    />
  );
}

export function DiscoveryLandingView(props: DiscoveryLandingViewProps) {
  return (
    <Suspense fallback={<Skeleton active />}>
      <DiscoveryLandingContent {...props} />
    </Suspense>
  );
}

export { cuisineSlug, discoverySlug };
