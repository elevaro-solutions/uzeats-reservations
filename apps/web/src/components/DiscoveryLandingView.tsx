'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dayjs from 'dayjs';
import { Col, Row, Segmented, Skeleton, Typography, message } from 'antd';
import {
  AppstoreOutlined,
  CrownFilled,
  EnvironmentFilled,
  GlobalOutlined,
  SearchOutlined,
  TagFilled,
  ThunderboltFilled,
} from '@ant-design/icons';
import {
  buildRestaurantBookingPath,
  cuisineSlug,
  discoverySlug,
  type DiscoveryLandingMeta,
} from '@reservations/shared';
import {
  RestaurantCard,
  EmptyState,
  colors,
  layout,
  radii,
  shadows,
  typography,
  pickRestaurantPhoto,
} from '@reservations/ui';
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
import { itemListJsonLd } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';

const { Title, Paragraph, Text } = Typography;
const NEARBY_RADIUS_KM = 16;
const SEARCH_DEBOUNCE_MS = 500;

const HERO_HIGHLIGHTS = [
  { icon: <ThunderboltFilled />, label: 'Instant confirmation' },
  { icon: <TagFilled />, label: 'Free for diners' },
  { icon: <CrownFilled />, label: 'Loyalty rewards' },
] as const;

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

function defaultPresetLocation(preset: DiscoverySearchPreset): LocationSelection {
  return {
    label: preset.locationLabel ?? (preset.city ? `${preset.city}` : cityLabel(DEFAULT_LOCATION)),
    lat: preset.lat ?? DEFAULT_LOCATION.lat,
    lng: preset.lng ?? DEFAULT_LOCATION.lng,
    city: preset.city,
    neighborhood: preset.neighborhood,
  };
}

function DiscoveryLandingContent({
  meta,
  breadcrumbs,
  canonicalPath,
  preset,
  relatedLinks = [],
}: DiscoveryLandingViewProps) {
  const router = useRouter();
  const presetLocation = useMemo(() => defaultPresetLocation(preset), [preset]);
  const { filters, replaceFilters } = useDiscoveryUrlSync();
  const [queryDraft, setQueryDraft] = useState(filters.query);
  const [locationInput, setLocationInput] = useState(
    filters.locationLabel ?? presetLocation.label,
  );
  const [geoLoading, setGeoLoading] = useState(false);
  const { viewMode, setViewMode } = useDiscoveryViewMode();
  const [selectedMapRestaurantId, setSelectedMapRestaurantId] = useState<string | null>(null);
  const cardsPageRef = useRef<HTMLDivElement>(null);

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
    label: filters.locationLabel ?? presetLocation.label,
    lat: filters.lat ?? presetLocation.lat,
    lng: filters.lng ?? presetLocation.lng,
    city: preset.city,
    neighborhood: preset.neighborhood,
  };

  useEffect(() => {
    setQueryDraft(filters.query);
  }, [filters.query]);

  useEffect(() => {
    setLocationInput(filters.locationLabel ?? presetLocation.label);
  }, [filters.locationLabel, presetLocation.label]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (queryDraft !== filters.query) {
        replaceFilters({ query: queryDraft });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [queryDraft, filters.query, replaceFilters]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 961px)');
    const apply = () => {
      document.documentElement.classList.toggle('rt-map-view', viewMode === 'map' && media.matches);
    };
    apply();
    media.addEventListener('change', apply);
    return () => {
      media.removeEventListener('change', apply);
      document.documentElement.classList.remove('rt-map-view');
    };
  }, [viewMode]);

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
    if (!items.length) return [];
    return [
      itemListJsonLd({
        name: meta.heading,
        description: meta.description,
        url: canonicalPath,
        items,
      }),
    ];
  }, [meta, restaurants, canonicalPath]);

  const applyLocation = useCallback(
    (location: LocationSelection, fromDevice = false) => {
      replaceFilters({
        lat: location.lat,
        lng: location.lng,
        locationLabel: location.label,
        nearMe: fromDevice,
      });
    },
    [replaceFilters],
  );

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      message.error('Geolocation is not supported by your browser');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyLocation(
          {
            label: 'Near me',
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          true,
        );
        setGeoLoading(false);
        message.success('Showing restaurants near you');
      },
      (err) => {
        setGeoLoading(false);
        message.error(
          err.code === err.PERMISSION_DENIED
            ? 'Location access denied — please enable it in browser settings'
            : 'Could not determine your location',
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [applyLocation]);

  const clearDeviceLocation = useCallback(() => {
    applyLocation(presetLocation);
  }, [applyLocation, presetLocation]);

  const clearLocation = useCallback(() => {
    setLocationInput(presetLocation.label);
    replaceFilters({
      lat: presetLocation.lat,
      lng: presetLocation.lng,
      locationLabel: presetLocation.label,
      nearMe: false,
    });
  }, [presetLocation, replaceFilters]);

  const handleSearch = useCallback(() => {
    replaceFilters({ query: queryDraft });
    cardsPageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [queryDraft, replaceFilters]);

  const datePresets = useMemo(
    () => [
      { label: 'Today', value: dayjs() },
      { label: 'Tomorrow', value: dayjs().add(1, 'day') },
      { label: 'This weekend', value: dayjs().day() === 0 ? dayjs() : dayjs().day(6) },
    ],
    [],
  );

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
    setSelectedMapRestaurantId(null);
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

  const viewToggle = (
    <Segmented
      value={viewMode}
      onChange={(value) => setViewMode(value as 'list' | 'map')}
      options={[
        { label: 'Cards', value: 'list', icon: <AppstoreOutlined /> },
        { label: 'Map', value: 'map', icon: <GlobalOutlined /> },
      ]}
      style={{ fontWeight: typography.fontWeight.semibold }}
    />
  );

  const openRestaurant = useCallback(
    (items: any[], id: string) => {
      const r = items.find((item) => item.id === id);
      if (r) router.push(buildRestaurantBookingPath(r.slug, r.id));
    },
    [router],
  );

  const bookRestaurantSlot = useCallback(
    (items: any[], id: string, time: string) => {
      const r = items.find((item) => item.id === id);
      if (r) {
        router.push(
          `${buildRestaurantBookingPath(r.slug, r.id)}?date=${dateStr}&party=${partySize}&slot=${encodeURIComponent(time)}`,
        );
      }
    },
    [router, dateStr, partySize],
  );

  const renderMapResults = (
    items: any[],
    resultTotal: number,
    title: string,
    emptyContent?: ReactNode,
  ) => (
    <MapResultsLayout
      restaurants={items}
      center={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
      selectedId={selectedMapRestaurantId}
      date={dateStr}
      partySize={partySize}
      total={resultTotal}
      resultsTitle={title}
      filtersSidebar={mapFiltersSidebar}
      filtersDrawerContent={mapFiltersDrawer}
      activeFilterCount={activeFilterCount}
      hasMore={hasMore}
      loadingMore={loadingMore}
      onLoadMore={loadMore}
      onSelectRestaurant={setSelectedMapRestaurantId}
      onCloseRestaurant={() => setSelectedMapRestaurantId(null)}
      onOpenRestaurant={(id) => openRestaurant(items, id)}
      onSelectSlot={(id, time) => bookRestaurantSlot(items, id, time)}
      onClearCategory={clearFilters}
      emptyContent={emptyContent}
    />
  );

  const discoverySearch = (variant: 'hero' | 'map') => (
    <DiscoverySearchPanel
      variant={variant}
      actionsSlot={variant === 'map' ? viewToggle : undefined}
      query={queryDraft}
      cuisine={preset.cuisine}
      locationInput={locationInput}
      usingDeviceLocation={usingDeviceLocation}
      partySize={partySize}
      date={date}
      geoLoading={geoLoading}
      datePresets={datePresets}
      onQueryChange={setQueryDraft}
      onCuisineChange={() => {}}
      onLocationInputChange={setLocationInput}
      onSelectLocation={(loc) => applyLocation(loc)}
      onUseMyLocation={requestLocation}
      onClearLocation={clearLocation}
      onClearDeviceLocation={clearDeviceLocation}
      onDateChange={(next) => replaceFilters({ date: next.format('YYYY-MM-DD') })}
      onPartySizeChange={(next) => replaceFilters({ partySize: next })}
      onSearch={handleSearch}
      onClearCategory={() => {}}
    />
  );

  const emptyState = (
    <EmptyState
      icon={<SearchOutlined />}
      title="No matching restaurants with open tables"
      description="Try adjusting filters, date, or expanding your search area."
    />
  );

  const renderGrid = (items: any[]) => (
    <Row gutter={[20, 20]}>
      {items.map((r: any, i: number) => (
        <Col
          key={r.id}
          xs={24}
          sm={12}
          md={8}
          lg={6}
          className="rt-fade-up"
          style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
        >
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
  );

  const heroBadgeLabel = preset.city
    ? `${preset.city}${preset.neighborhood ? ` · ${preset.neighborhood}` : ''}`
    : 'Explore & book instantly';

  const landingFooter = (
    <div className="rt-discovery-landing__footer">
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

  return (
    <div className="rt-discovery-landing">
      {schemaBlocks.length > 0 ? <JsonLd data={schemaBlocks} /> : null}

      {viewMode === 'map' ? (
        <div className="rt-map-page">
          <div className="rt-map-page__search-bar">{discoverySearch('map')}</div>
          <div className="rt-map-page__content">
            {loading ? (
              <div className="rt-map-page__loading">
                <Skeleton active paragraph={{ rows: 8 }} />
              </div>
            ) : restaurants.length > 0 ? (
              renderMapResults(restaurants, total, meta.heading)
            ) : (
              renderMapResults([], 0, meta.heading, emptyState)
            )}
          </div>
        </div>
      ) : (
        <div className="rt-browse-layout">
          <section className="rt-hero">
            <div
              aria-hidden
              className="rt-hero-orb"
              style={{
                position: 'absolute',
                top: -160,
                right: '-8%',
                width: 520,
                height: 520,
                borderRadius: '50%',
                background: `radial-gradient(circle, rgba(61, 143, 111, 0.22) 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
            <div
              aria-hidden
              className="rt-hero-orb"
              style={{
                position: 'absolute',
                bottom: -220,
                left: '-6%',
                width: 460,
                height: 460,
                borderRadius: '50%',
                background: `radial-gradient(circle, rgba(197, 160, 89, 0.14) 0%, transparent 70%)`,
                pointerEvents: 'none',
                animationDelay: '-7s',
              }}
            />
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 75%)',
                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 75%)',
                pointerEvents: 'none',
              }}
            />

            <div
              style={{
                maxWidth: layout.contentMaxWidth,
                margin: '0 auto',
                padding: 'clamp(48px, 7vw, 72px) 24px 56px',
                position: 'relative',
                textAlign: 'center',
              }}
            >
              <DiscoveryBreadcrumbs items={breadcrumbs} className="rt-hero-breadcrumbs" />

              <span
                className="rt-fade-up rt-hero-badge"
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                }}
              >
                <EnvironmentFilled style={{ color: colors.accent[400] }} />
                {heroBadgeLabel}
              </span>

              <Title
                className="rt-fade-up"
                style={{
                  color: '#fff',
                  margin: '18px auto 0',
                  fontSize: 'clamp(32px, 5vw, 52px)',
                  lineHeight: 1.1,
                  letterSpacing: typography.letterSpacing.tight,
                  maxWidth: 820,
                  fontWeight: typography.fontWeight.bold,
                  animationDelay: '60ms',
                }}
              >
                {meta.heading}
              </Title>

              <Paragraph
                className="rt-fade-up"
                style={{
                  color: 'rgba(255,255,255,0.78)',
                  maxWidth: 620,
                  margin: '16px auto 0',
                  fontSize: typography.fontSize.md,
                  lineHeight: 1.55,
                  animationDelay: '120ms',
                }}
              >
                {meta.intro}
              </Paragraph>

              {discoverySearch('hero')}

              <div
                className="rt-fade-up"
                style={{
                  marginTop: 22,
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 10,
                  animationDelay: '240ms',
                }}
              >
                {HERO_HIGHLIGHTS.map((h) => (
                  <span
                    key={h.label}
                    className="rt-hero-pill"
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    <span style={{ color: colors.accent[400], display: 'inline-flex' }}>
                      {h.icon}
                    </span>
                    {h.label}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <div
            ref={cardsPageRef}
            className="rt-cards-page"
            style={{ scrollMarginTop: 'calc(var(--header-height, 64px) + 12px)' }}
          >
            <div className="rt-cards-page__toolbar">
              <span className="rt-cards-page__toolbar-label">Browse restaurants</span>
              {viewToggle}
            </div>

            <div className="rt-cards-page__body">
              {loading ? (
                <div className="rt-cards-page__split">
                  <div className="rt-filters-desktop">{mapFiltersSidebar}</div>
                  <section className="rt-cards-page__main">
                    <Skeleton.Input active style={{ width: 260, height: 30, marginBottom: 20 }} />
                    <SkeletonGrid count={8} />
                  </section>
                </div>
              ) : restaurants.length === 0 ? (
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
                  {emptyState}
                </DiscoveryCardsLayout>
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
                  {renderGrid(restaurants)}
                </DiscoveryCardsLayout>
              )}
            </div>
          </div>

          {landingFooter}
        </div>
      )}
    </div>
  );
}

function SkeletonGrid({ count }: { count: number }) {
  return (
    <Row gutter={[20, 20]}>
      {Array.from({ length: count }, (_, i) => (
        <Col key={i} xs={24} sm={12} md={8} lg={6}>
          <div
            style={{
              background: colors.surface,
              borderRadius: radii.lg,
              overflow: 'hidden',
              boxShadow: shadows.sm,
              border: `1px solid ${colors.bordersubtle}`,
            }}
          >
            <Skeleton.Node active style={{ width: '100%', height: 190, borderRadius: 0 }} />
            <div style={{ padding: 16 }}>
              <Skeleton active title={{ width: '60%' }} paragraph={{ rows: 2, width: ['45%', '80%'] }} />
            </div>
          </div>
        </Col>
      ))}
    </Row>
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
