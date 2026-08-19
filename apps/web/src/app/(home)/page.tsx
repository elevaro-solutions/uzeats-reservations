'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import {
  Col,
  Row,
  Segmented,
  Skeleton,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { RestaurantCard, EmptyState, colors, layout, radii, shadows, typography, pickRestaurantPhoto } from '@reservations/ui';
import {
  AppstoreOutlined,
  CoffeeOutlined,
  CrownFilled,
  EnvironmentFilled,
  FireOutlined,
  GiftOutlined,
  GlobalOutlined,
  HeartOutlined,
  RocketOutlined,
  SearchOutlined,
  SmileOutlined,
  StarFilled,
  SunOutlined,
  TagFilled,
  TeamOutlined,
  ThunderboltFilled,
  TrophyOutlined,
} from '@ant-design/icons';
import { buildRestaurantBookingPath, RESTAURANT_DISCOVERY_CATEGORIES } from '@reservations/shared';
import { SEARCH_RESTAURANTS, AVAILABILITY } from '@/lib/graphql';
import { useInfiniteRestaurantSearch } from '@/lib/useInfiniteRestaurantSearch';
import { useDiscoveryViewMode } from '@/lib/useDiscoveryViewMode';
import { useDiscoveryUrlSync } from '@/lib/useDiscoveryFilters';
import { DEFAULT_LOCATION, cityLabel } from '@/lib/cities';
import type { LocationSelection } from '@/components/AddressAutocomplete';
import { MapResultsLayout } from '@/components/MapResultsLayout';
import { DiscoveryCardsLayout } from '@/components/DiscoveryCardsLayout';
import { DiscoverySearchPanel } from '@/components/DiscoverySearchPanel';
import { MapFiltersSidebar, countActiveDiscoveryFilters } from '@/components/MapFiltersSidebar';

const { Title, Paragraph, Text } = Typography;

/** Search radius for address / near-me results (~10 miles). */
const NEARBY_RADIUS_KM = 16;
const SEARCH_DEBOUNCE_MS = 500;

const HERO_HIGHLIGHTS = [
  { icon: <ThunderboltFilled />, label: 'Instant confirmation' },
  { icon: <TagFilled />, label: 'Free for diners' },
  { icon: <CrownFilled />, label: 'Loyalty rewards' },
] as const;

const HERO_STATS = [
  { value: '12,000+', label: 'Restaurants' },
  { value: '2M+', label: 'Diners served' },
  { value: '4.8★', label: 'Average rating' },
] as const;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  romantic: <HeartOutlined />,
  italian: <CoffeeOutlined />,
  brunch: <SunOutlined />,
  mexican: <FireOutlined />,
  pizza: <StarFilled />,
  seafood: <GlobalOutlined />,
  american: <CrownFilled />,
  fun: <RocketOutlined />,
  japanese: <CoffeeOutlined />,
  birthdays: <GiftOutlined />,
  sushi: <StarFilled />,
  steak: <FireOutlined />,
  casual: <SmileOutlined />,
  chinese: <CoffeeOutlined />,
  mediterranean: <GlobalOutlined />,
  indian: <FireOutlined />,
  groups: <TeamOutlined />,
  'fine-dining': <TrophyOutlined />,
  'kid-friendly': <SmileOutlined />,
  tapas: <TagFilled />,
};

function HomePageContent() {
  const router = useRouter();
  const { filters, replaceFilters } = useDiscoveryUrlSync();
  const [queryDraft, setQueryDraft] = useState(filters.query);
  const [locationInput, setLocationInput] = useState(filters.locationLabel ?? '');
  const [geoLoading, setGeoLoading] = useState(false);
  const { viewMode, setViewMode } = useDiscoveryViewMode();
  const [selectedMapRestaurantId, setSelectedMapRestaurantId] = useState<string | null>(null);
  const cardsPageRef = useRef<HTMLDivElement>(null);
  const skipFilterReset = useRef(true);

  const cuisine = filters.cuisine;
  const activeCategoryIds = filters.categoryIds;
  const mapPriceRange = filters.priceRange;
  const occasions = filters.occasions;
  const diningStyles = filters.diningStyles;
  const meals = filters.meals;
  const dietaryTags = filters.dietaryTags;
  const amenities = filters.amenities;
  const topRatedOnly = filters.topRatedOnly;
  const accessibleOnly = filters.accessibleOnly;
  const partySize = filters.partySize;
  const date = dayjs(filters.date);
  const usingDeviceLocation = filters.nearMe;
  const hasExplicitLocation = filters.lat != null && filters.lng != null;
  const selectedLocation: LocationSelection = {
    label: filters.locationLabel ?? cityLabel(DEFAULT_LOCATION),
    lat: hasExplicitLocation ? filters.lat : DEFAULT_LOCATION.lat,
    lng: hasExplicitLocation ? filters.lng : DEFAULT_LOCATION.lng,
  };

  useEffect(() => {
    setQueryDraft(filters.query);
  }, [filters.query]);

  useEffect(() => {
    setLocationInput(filters.locationLabel ?? '');
  }, [filters.locationLabel]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (queryDraft !== filters.query) {
        replaceFilters({ query: queryDraft });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [queryDraft, filters.query, replaceFilters]);

  useEffect(() => {
    if (skipFilterReset.current) {
      skipFilterReset.current = false;
      return;
    }
    setSelectedMapRestaurantId(null);
  }, [filters.query, cuisine, activeCategoryIds, selectedLocation.lat, selectedLocation.lng, partySize, filters.date, mapPriceRange, topRatedOnly, accessibleOnly, occasions, diningStyles, meals, dietaryTags, amenities]);

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

  const activeCategories = useMemo(
    () => RESTAURANT_DISCOVERY_CATEGORIES.filter((c) => activeCategoryIds.includes(c.id)),
    [activeCategoryIds],
  );

  const searchQuery = filters.query || undefined;

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
    applyLocation({
      label: cityLabel(DEFAULT_LOCATION),
      lat: DEFAULT_LOCATION.lat,
      lng: DEFAULT_LOCATION.lng,
    });
  }, [applyLocation]);

  const clearLocation = useCallback(() => {
    setLocationInput('');
    replaceFilters({
      lat: undefined,
      lng: undefined,
      locationLabel: undefined,
      nearMe: false,
    });
  }, [replaceFilters]);

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

  const dateStr = date.format('YYYY-MM-DD');

  const searchInput = useMemo(
    () => ({
      query: searchQuery,
      cuisine,
      categoryIds: activeCategoryIds.length ? activeCategoryIds : undefined,
      priceRange: mapPriceRange,
      occasions: occasions.length ? occasions : undefined,
      diningStyles: diningStyles.length ? diningStyles : undefined,
      meals: meals.length ? meals : undefined,
      dietaryTags: dietaryTags.length ? dietaryTags : undefined,
      amenities: amenities.length ? amenities : undefined,
      minRating: topRatedOnly ? 4.5 : undefined,
      wheelchairAccessible: accessibleOnly || undefined,
      partySize,
      date: dateStr,
      requireAvailability: true,
      lat: hasExplicitLocation ? selectedLocation.lat : undefined,
      lng: hasExplicitLocation ? selectedLocation.lng : undefined,
      radiusKm: hasExplicitLocation ? NEARBY_RADIUS_KM : undefined,
      city: hasExplicitLocation ? selectedLocation.city : undefined,
      neighborhood: hasExplicitLocation ? selectedLocation.neighborhood : undefined,
    }),
    [
      searchQuery,
      cuisine,
      activeCategoryIds,
      mapPriceRange,
      occasions,
      diningStyles,
      meals,
      dietaryTags,
      amenities,
      topRatedOnly,
      accessibleOnly,
      partySize,
      dateStr,
      hasExplicitLocation,
      selectedLocation.lat,
      selectedLocation.lng,
      selectedLocation.city,
      selectedLocation.neighborhood,
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

  const visibleRestaurants = useMemo(() => restaurants, [restaurants]);

  const hasDiscoveryFilters = Boolean(
    activeCategoryIds.length > 0 ||
      mapPriceRange != null ||
      topRatedOnly ||
      accessibleOnly ||
      occasions.length > 0 ||
      diningStyles.length > 0 ||
      meals.length > 0 ||
      dietaryTags.length > 0 ||
      amenities.length > 0 ||
      filters.query ||
      cuisine,
  );

  const visibleTotal = total;
  const noResults = !loading && restaurants.length === 0;
  // Fallback: when nothing matches (e.g. no restaurants near the user's
  // location), surface the top 20 restaurants platform-wide instead.
  const { data: topData, loading: topLoading } = useQuery(SEARCH_RESTAURANTS, {
    variables: { input: { partySize, date: dateStr, page: 1, limit: 20 } },
    skip: !noResults,
  });
  const topRestaurants = (topData as any)?.searchRestaurants?.items ?? [];

  const resultsTitle = usingDeviceLocation
    ? 'Restaurants near you'
    : hasExplicitLocation
      ? `Restaurants near ${selectedLocation.label.split(',').slice(0, 2).join(',').trim()}`
      : 'Restaurants';

  const clearCategoryFilters = useCallback(() => {
    replaceFilters({ categoryIds: [], cuisine: undefined });
  }, [replaceFilters]);

  const clearMapFilters = useCallback(() => {
    replaceFilters({
      query: '',
      categoryIds: [],
      cuisine: undefined,
      priceRange: undefined,
      occasions: [],
      diningStyles: [],
      meals: [],
      dietaryTags: [],
      amenities: [],
      topRatedOnly: false,
      accessibleOnly: false,
    });
    setSelectedMapRestaurantId(null);
  }, [replaceFilters]);

  const handleCuisineChange = useCallback(
    (value: string | undefined) => {
      const match = value
        ? RESTAURANT_DISCOVERY_CATEGORIES.find((c) => 'cuisine' in c && c.cuisine === value)
        : undefined;
      replaceFilters({
        cuisine: value,
        categoryIds: match ? [match.id] : [],
        query: value ? '' : filters.query,
      });
    },
    [replaceFilters, filters.query],
  );

  const handleCategoryIdsChange = useCallback(
    (ids: string[]) => {
      const cuisineCategory =
        ids.length === 1
          ? RESTAURANT_DISCOVERY_CATEGORIES.find((c) => c.id === ids[0] && 'cuisine' in c)
          : undefined;
      replaceFilters({
        categoryIds: ids,
        cuisine:
          cuisineCategory && 'cuisine' in cuisineCategory ? cuisineCategory.cuisine : undefined,
        query: ids.length > 0 ? '' : filters.query,
      });
      setSelectedMapRestaurantId(null);
    },
    [replaceFilters, filters.query],
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

  const mapFilterState = {
    categoryIds: activeCategoryIds,
    priceRange: mapPriceRange,
    occasions,
    diningStyles,
    meals,
    dietaryTags,
    amenities,
    topRatedOnly,
    accessibleOnly,
  };

  const activeFilterCount =
    countActiveDiscoveryFilters(mapFilterState) + (filters.query ? 1 : 0);

  const mapFiltersProps = {
    categories: RESTAURANT_DISCOVERY_CATEGORIES.map((category) => ({
      id: category.id,
      label: category.label,
      icon: CATEGORY_ICONS[category.id],
    })),
    filters: mapFilterState,
    activeFilterCount,
    onCategoryIdsChange: handleCategoryIdsChange,
    onPriceRangeChange: (priceRange?: number) => replaceFilters({ priceRange }),
    onOccasionsChange: (next: string[]) => replaceFilters({ occasions: next }),
    onDiningStylesChange: (next: string[]) => replaceFilters({ diningStyles: next }),
    onMealsChange: (next: string[]) => replaceFilters({ meals: next }),
    onDietaryTagsChange: (next: string[]) => replaceFilters({ dietaryTags: next }),
    onAmenitiesChange: (next: string[]) => replaceFilters({ amenities: next }),
    onTopRatedChange: (enabled: boolean) => replaceFilters({ topRatedOnly: enabled }),
    onAccessibleChange: (enabled: boolean) => replaceFilters({ accessibleOnly: enabled }),
    onClearAll: clearMapFilters,
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

  const renderMapResults = (
    items: any[],
    resultTotal: number,
    title: string,
    isFallback = false,
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
      activeCategoryLabel={
        activeCategories.length > 0
          ? activeCategories.map((c) => c.label).join(', ')
          : undefined
      }
      filtersSidebar={mapFiltersSidebar}
      filtersDrawerContent={mapFiltersDrawer}
      activeFilterCount={activeFilterCount}
      hasMore={isFallback ? false : hasMore}
      loadingMore={isFallback ? false : loadingMore}
      onLoadMore={isFallback ? () => {} : loadMore}
      onSelectRestaurant={setSelectedMapRestaurantId}
      onCloseRestaurant={() => setSelectedMapRestaurantId(null)}
      onOpenRestaurant={(id) => openRestaurant(items, id)}
      onSelectSlot={(id, time) => bookRestaurantSlot(items, id, time)}
      onClearCategory={isFallback ? undefined : clearMapFilters}
      emptyContent={emptyContent}
    />
  );

  const discoverySearch = (variant: 'hero' | 'map') => (
    <DiscoverySearchPanel
      variant={variant}
      actionsSlot={variant === 'map' ? viewToggle : undefined}
      query={queryDraft}
      cuisine={cuisine}
      locationInput={locationInput}
      usingDeviceLocation={usingDeviceLocation}
      partySize={partySize}
      date={date}
      geoLoading={geoLoading}
      datePresets={datePresets}
      onQueryChange={setQueryDraft}
      onCuisineChange={handleCuisineChange}
      onLocationInputChange={setLocationInput}
      onSelectLocation={(loc) => applyLocation(loc)}
      onUseMyLocation={requestLocation}
      onClearLocation={clearLocation}
      onClearDeviceLocation={clearDeviceLocation}
      onDateChange={(next) => replaceFilters({ date: next.format('YYYY-MM-DD') })}
      onPartySizeChange={(next) => replaceFilters({ partySize: next })}
      onSearch={handleSearch}
      onClearCategory={clearCategoryFilters}
    />
  );

  const renderGrid = (items: any[]) => (
    <Row gutter={[20, 20]}>
      {items.map((r: any, i: number) => (
        <Col key={r.id} xs={24} sm={12} md={8} lg={6} className="rt-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
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

  return (
    <div component="HomePageContent">
      {viewMode === 'map' ? (
        <div className="rt-map-page">
          <div className="rt-map-page__search-bar">
            {discoverySearch('map')}
          </div>
          <div className="rt-map-page__content">
            {loading ? (
              <div className="rt-map-page__loading">
                <Skeleton active paragraph={{ rows: 8 }} />
              </div>
            ) : visibleRestaurants.length > 0 ? (
              renderMapResults(visibleRestaurants, visibleTotal, resultsTitle)
            ) : hasDiscoveryFilters ? (
              renderMapResults(
                [],
                0,
                resultsTitle,
                false,
                <EmptyState
                  icon={<SearchOutlined />}
                  title="No restaurants match your filters"
                  description="Try a different category, price range, or location."
                />,
              )
            ) : noResults && topLoading ? (
              <div className="rt-map-page__loading">
                <Skeleton active paragraph={{ rows: 8 }} />
              </div>
            ) : topRestaurants.length > 0 ? (
              renderMapResults(topRestaurants, topRestaurants.length, 'Top restaurants across Tablevera', true)
            ) : (
              <div className="rt-map-page__empty">
                <EmptyState
                  icon={<SearchOutlined />}
                  title="No restaurants yet"
                  description="New restaurants join Tablevera every week — check back soon."
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rt-browse-layout">
      <section className="rt-hero">
        {/* decorative glows */}
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
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
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
          <span
            className="rt-fade-up rt-hero-badge"
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
            }}
          >
            <StarFilled style={{ color: colors.rating }} />
            Rated 4.8/5 by diners nationwide
          </span>

          <Title
            className="rt-fade-up"
            style={{
              color: '#fff',
              margin: '18px auto 0',
              fontSize: 'clamp(38px, 5.5vw, 60px)',
              lineHeight: 1.08,
              letterSpacing: typography.letterSpacing.tight,
              maxWidth: 780,
              fontWeight: typography.fontWeight.bold,
              animationDelay: '60ms',
            }}
          >
            Find your table.{' '}
            <span style={{ color: colors.accent[300], display: 'inline-block' }}>
              Book it in seconds.
            </span>
          </Title>

          <Paragraph
            className="rt-fade-up"
            style={{
              color: 'rgba(255,255,255,0.78)',
              maxWidth: 520,
              margin: '16px auto 0',
              fontSize: typography.fontSize.md,
              lineHeight: 1.55,
              animationDelay: '120ms',
            }}
          >
            Reserve at thousands of restaurants across the USA — always free for
            diners, confirmed instantly.
          </Paragraph>

          {discoverySearch('hero')}

          {/* highlights */}
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

          {/* social proof stats */}
          <div
            className="rt-fade-up"
            style={{
              marginTop: 30,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '14px 0',
              animationDelay: '300ms',
            }}
          >
            {HERO_STATS.map((s, i) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '14px 32px' }}>
                {i > 0 && (
                  <span
                    aria-hidden
                    className="rt-hero-stat-sep"
                    style={{
                      width: 1,
                      height: 30,
                      background: 'rgba(255,255,255,0.16)',
                      display: 'inline-block',
                    }}
                  />
                )}
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      color: '#fff',
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.bold,
                      lineHeight: 1.1,
                      letterSpacing: typography.letterSpacing.tight,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: typography.fontSize.xs,
                      textTransform: 'uppercase',
                      letterSpacing: typography.letterSpacing.wide,
                      marginTop: 2,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              </div>
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
          ) : (
            <DiscoveryCardsLayout
              filtersSidebar={mapFiltersSidebar}
              filtersDrawerContent={mapFiltersDrawer}
              activeFilterCount={activeFilterCount}
              total={
                restaurants.length > 0
                  ? total
                  : hasDiscoveryFilters
                    ? 0
                    : topRestaurants.length
              }
              resultsTitle={
                restaurants.length > 0
                  ? resultsTitle
                  : hasDiscoveryFilters
                    ? resultsTitle
                    : topRestaurants.length > 0
                      ? 'Top 20 restaurants'
                      : resultsTitle
              }
              activeCategoryLabel={
                activeCategories.length > 0
                  ? activeCategories.map((c) => c.label).join(', ')
                  : undefined
              }
              onClearFilters={clearMapFilters}
              hasMore={restaurants.length > 0 && !hasDiscoveryFilters ? hasMore : false}
              loadingMore={restaurants.length > 0 ? loadingMore : false}
              onLoadMore={restaurants.length > 0 ? loadMore : () => {}}
            >
              {restaurants.length > 0 ? (
                renderGrid(restaurants)
              ) : hasDiscoveryFilters ? (
                <EmptyState
                  icon={<SearchOutlined />}
                  title="No restaurants match your filters"
                  description="Try a different category, price range, or location."
                />
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      background: `linear-gradient(120deg, ${colors.brand[50]}, #fff)`,
                      border: `1px solid ${colors.brand[100]}`,
                      borderRadius: radii.lg,
                      padding: '16px 20px',
                      marginBottom: 24,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        flexShrink: 0,
                        borderRadius: '50%',
                        background: colors.brand[100],
                        color: colors.brand[600],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                      }}
                    >
                      <EnvironmentFilled />
                    </div>
                    <div>
                      <Text strong style={{ display: 'block', fontSize: typography.fontSize.md }}>
                        No restaurants found near {usingDeviceLocation ? 'you' : selectedLocation.label}
                      </Text>
                      <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
                        Don&apos;t worry — here are the top 20 restaurants on Tablevera, loved by
                        thousands of diners.
                      </Text>
                    </div>
                  </div>

                  {topLoading ? (
                    <SkeletonGrid count={8} />
                  ) : topRestaurants.length > 0 ? (
                    renderGrid(topRestaurants)
                  ) : (
                    <EmptyState
                      icon={<SearchOutlined />}
                      title="No restaurants yet"
                      description="New restaurants join Tablevera every week — check back soon."
                    />
                  )}
                </>
              )}
            </DiscoveryCardsLayout>
          )}
        </div>
      </div>
        </div>
      )}
    </div>
  );
}

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div component="SkeletonGrid" style={{ display: 'contents' }}><Row gutter={[20, 20]}>
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
    </Row></div>
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
    <div component="RestaurantWithSlots" style={{ display: 'contents' }}><RestaurantCard       id={restaurant.id}
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
    /></div>
  );
}

export default function HomePage() {
  return (
    <div component="HomePage" style={{ display: 'contents' }}><Suspense fallback={null}>
      <HomePageContent />
    </Suspense></div>
  );
}
