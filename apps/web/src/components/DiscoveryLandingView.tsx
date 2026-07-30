'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dayjs from 'dayjs';
import { Col, Row, Segmented, Skeleton, Typography } from 'antd';
import { GlobalOutlined, SearchOutlined } from '@ant-design/icons';
import {
  buildRestaurantBookingPath,
  cuisineSlug,
  discoverySlug,
  type DiscoveryLandingMeta,
} from '@reservations/shared';
import { RestaurantCard, EmptyState, layout, typography, pickRestaurantPhoto } from '@reservations/ui';
import { AVAILABILITY } from '@/lib/graphql';
import { useInfiniteRestaurantSearch } from '@/lib/useInfiniteRestaurantSearch';
import { useDiscoveryViewMode } from '@/lib/useDiscoveryViewMode';
import { useDiscoveryUrlSync } from '@/lib/useDiscoveryFilters';
import { DEFAULT_LOCATION, cityLabel } from '@/lib/cities';
import type { LocationSelection } from '@/components/AddressAutocomplete';
import { MapResultsLayout } from '@/components/MapResultsLayout';
import { DiscoveryCardsLayout } from '@/components/DiscoveryCardsLayout';
import { DiscoverySearchPanel } from '@/components/DiscoverySearchPanel';
import { MapFiltersSidebar, countActiveDiscoveryFilters } from '@/components/MapFiltersSidebar';
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
  const { filters, replaceFilters } = useDiscoveryUrlSync();
  const [queryDraft, setQueryDraft] = useState(filters.query);
  const [locationInput, setLocationInput] = useState(
    filters.locationLabel ?? preset.locationLabel ?? (preset.city ? `${preset.city}` : cityLabel(DEFAULT_LOCATION)),
  );
  const [geoLoading, setGeoLoading] = useState(false);
  const { viewMode, setViewMode } = useDiscoveryViewMode();
  const [selectedMapRestaurantId, setSelectedMapRestaurantId] = useState<string | null>(null);

  const partySize = filters.partySize;
  const date = dayjs(filters.date);
  const mapPriceRange = filters.priceRange;
  const topRatedOnly = filters.topRatedOnly;
  const accessibleOnly = filters.accessibleOnly;
  const occasions = filters.occasions.length
    ? filters.occasions
    : preset.occasion
      ? [preset.occasion]
      : [];
  const diningStyles = filters.diningStyles.length
    ? filters.diningStyles
    : preset.diningStyle
      ? [preset.diningStyle]
      : [];
  const meals = filters.meals.length ? filters.meals : preset.meal ? [preset.meal] : [];
  const dietaryTags = filters.dietaryTags.length
    ? filters.dietaryTags
    : preset.dietary
      ? [preset.dietary]
      : [];
  const amenities = filters.amenities.length
    ? filters.amenities
    : preset.amenity
      ? [preset.amenity]
      : [];
  const usingDeviceLocation = filters.nearMe;
  const selectedLocation: LocationSelection = {
    label: filters.locationLabel ?? preset.locationLabel ?? cityLabel(DEFAULT_LOCATION),
    lat: filters.lat ?? preset.lat ?? DEFAULT_LOCATION.lat,
    lng: filters.lng ?? preset.lng ?? DEFAULT_LOCATION.lng,
  };

  useEffect(() => {
    setQueryDraft(filters.query);
  }, [filters.query]);

  useEffect(() => {
    setLocationInput(
      filters.locationLabel ?? preset.locationLabel ?? (preset.city ? `${preset.city}` : cityLabel(DEFAULT_LOCATION)),
    );
  }, [filters.locationLabel, preset.locationLabel, preset.city]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (queryDraft !== filters.query) {
        replaceFilters({ query: queryDraft });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [queryDraft, filters.query, replaceFilters]);

  const dateStr = date.format('YYYY-MM-DD');

  const searchInput = useMemo(
    () => ({
      query: filters.query || undefined,
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
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      radiusKm: NEARBY_RADIUS_KM,
    }),
    [
      filters.query,
      preset.cuisine,
      preset.city,
      preset.neighborhood,
      occasions,
      diningStyles,
      meals,
      dietaryTags,
      amenities,
      mapPriceRange,
      topRatedOnly,
      accessibleOnly,
      partySize,
      dateStr,
      selectedLocation.lat,
      selectedLocation.lng,
    ],
  );

  const {
    items: restaurants,
    total,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  } = useInfiniteRestaurantSearch(searchInput, { pageSize: 24 });

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
    replaceFilters({
      query: '',
      priceRange: undefined,
      topRatedOnly: false,
      accessibleOnly: false,
      occasions: preset.occasion ? [preset.occasion] : [],
      diningStyles: preset.diningStyle ? [preset.diningStyle] : [],
      meals: preset.meal ? [preset.meal] : [],
      dietaryTags: preset.dietary ? [preset.dietary] : [],
      amenities: preset.amenity ? [preset.amenity] : [],
    });
    setQueryDraft('');
  }, [preset, replaceFilters]);

  const mapFilterState = {
    categoryIds: [] as string[],
    priceRange: mapPriceRange,
    occasions,
    diningStyles,
    meals,
    dietaryTags,
    amenities,
    topRatedOnly,
    accessibleOnly,
  };

  const urlFilterState = {
    categoryIds: [] as string[],
    priceRange: filters.priceRange,
    occasions: filters.occasions,
    diningStyles: filters.diningStyles,
    meals: filters.meals,
    dietaryTags: filters.dietaryTags,
    amenities: filters.amenities,
    topRatedOnly: filters.topRatedOnly,
    accessibleOnly: filters.accessibleOnly,
  };

  const activeFilterCount =
    countActiveDiscoveryFilters(urlFilterState) + (filters.query ? 1 : 0);

  const mapFiltersProps = {
    categories: [],
    filters: mapFilterState,
    activeFilterCount,
    onCategoryIdsChange: () => {},
    onPriceRangeChange: (priceRange?: number) => replaceFilters({ priceRange }),
    onOccasionsChange: (next: string[]) => replaceFilters({ occasions: next }),
    onDiningStylesChange: (next: string[]) => replaceFilters({ diningStyles: next }),
    onMealsChange: (next: string[]) => replaceFilters({ meals: next }),
    onDietaryTagsChange: (next: string[]) => replaceFilters({ dietaryTags: next }),
    onAmenitiesChange: (next: string[]) => replaceFilters({ amenities: next }),
    onTopRatedChange: (enabled: boolean) => replaceFilters({ topRatedOnly: enabled }),
    onAccessibleChange: (enabled: boolean) => replaceFilters({ accessibleOnly: enabled }),
    onClearAll: clearFilters,
  };

  const mapFiltersSidebar = <MapFiltersSidebar {...mapFiltersProps} />;
  const mapFiltersDrawer = <MapFiltersSidebar {...mapFiltersProps} variant="drawer" />;

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
        query={queryDraft}
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
        onQueryChange={setQueryDraft}
        onCuisineChange={() => {}}
        onLocationInputChange={setLocationInput}
        onSelectLocation={(loc) => {
          replaceFilters({
            lat: loc.lat,
            lng: loc.lng,
            locationLabel: loc.label,
            nearMe: false,
          });
        }}
        onUseMyLocation={() => {
          if (!navigator.geolocation) return;
          setGeoLoading(true);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              replaceFilters({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                locationLabel: 'Near me',
                nearMe: true,
              });
              setLocationInput('Near me');
              setGeoLoading(false);
            },
            () => setGeoLoading(false),
          );
        }}
        onClearLocation={() => {
          setLocationInput(cityLabel(DEFAULT_LOCATION));
          replaceFilters({
            lat: DEFAULT_LOCATION.lat,
            lng: DEFAULT_LOCATION.lng,
            locationLabel: cityLabel(DEFAULT_LOCATION),
            nearMe: false,
          });
        }}
        onClearDeviceLocation={() => replaceFilters({ nearMe: false })}
        onDateChange={(next) => replaceFilters({ date: next.format('YYYY-MM-DD') })}
        onPartySizeChange={(next) => replaceFilters({ partySize: next })}
        onSearch={() => replaceFilters({ query: queryDraft })}
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
        viewMode === 'map' ? (
          <MapResultsLayout
            restaurants={[]}
            center={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
            selectedId={selectedMapRestaurantId}
            date={dateStr}
            partySize={partySize}
            total={0}
            resultsTitle={meta.heading}
            filtersSidebar={mapFiltersSidebar}
            filtersDrawerContent={mapFiltersDrawer}
            activeFilterCount={activeFilterCount}
            hasMore={false}
            loadingMore={false}
            onLoadMore={() => {}}
            onSelectRestaurant={setSelectedMapRestaurantId}
            onCloseRestaurant={() => setSelectedMapRestaurantId(null)}
            onOpenRestaurant={() => {}}
            onSelectSlot={() => {}}
            onClearCategory={clearFilters}
            emptyContent={
              <EmptyState
                icon={<SearchOutlined />}
                title="No matching restaurants with open tables"
                description="Try adjusting filters, date, or expanding your search area."
              />
            }
          />
        ) : (
          <DiscoveryCardsLayout
            filtersSidebar={mapFiltersSidebar}
            filtersDrawerContent={mapFiltersDrawer}
            activeFilterCount={activeFilterCount}
            total={0}
            resultsTitle={meta.heading}
            onClearFilters={clearFilters}
            hasMore={false}
            loadingMore={false}
            onLoadMore={() => {}}
          >
            <EmptyState
              icon={<SearchOutlined />}
              title="No matching restaurants with open tables"
              description="Try adjusting filters, date, or expanding your search area."
            />
          </DiscoveryCardsLayout>
        )
      ) : viewMode === 'map' ? (
        <MapResultsLayout
          restaurants={restaurants}
          center={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
          selectedId={selectedMapRestaurantId}
          date={dateStr}
          partySize={partySize}
          total={total}
          resultsTitle={meta.heading}
          filtersSidebar={mapFiltersSidebar}
          filtersDrawerContent={mapFiltersDrawer}
          activeFilterCount={activeFilterCount}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
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
        <DiscoveryCardsLayout
          filtersSidebar={mapFiltersSidebar}
          filtersDrawerContent={mapFiltersDrawer}
          activeFilterCount={activeFilterCount}
          total={total}
          resultsTitle={meta.heading}
          onClearFilters={clearFilters}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
        >
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
        </DiscoveryCardsLayout>
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
      photoUrl={pickRestaurantPhoto(restaurant.photos)}
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
