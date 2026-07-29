'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import {
  Col,
  Pagination,
  Row,
  Segmented,
  Skeleton,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { RestaurantCard, EmptyState, colors, layout, radii, shadows, typography } from '@reservations/ui';
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
import { useUrlPagination } from '@/lib/useUrlPagination';
import { useDiscoveryViewMode } from '@/lib/useDiscoveryViewMode';
import { DEFAULT_LOCATION, cityLabel } from '@/lib/cities';
import type { LocationSelection } from '@/components/AddressAutocomplete';
import { MapResultsLayout } from '@/components/MapResultsLayout';
import { DiscoverySearchPanel } from '@/components/DiscoverySearchPanel';
import { MapFiltersSidebar } from '@/components/MapFiltersSidebar';

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
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [cuisine, setCuisine] = useState<string | undefined>();
  const [activeCategoryIds, setActiveCategoryIds] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState(cityLabel(DEFAULT_LOCATION));
  const [selectedLocation, setSelectedLocation] = useState<LocationSelection>({
    label: cityLabel(DEFAULT_LOCATION),
    lat: DEFAULT_LOCATION.lat,
    lng: DEFAULT_LOCATION.lng,
  });
  const [usingDeviceLocation, setUsingDeviceLocation] = useState(false);
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState(dayjs().add(1, 'day'));
  const [geoLoading, setGeoLoading] = useState(false);
  const [mapPriceRange, setMapPriceRange] = useState<number | undefined>();
  const [occasions, setOccasions] = useState<string[]>([]);
  const [diningStyles, setDiningStyles] = useState<string[]>([]);
  const [meals, setMeals] = useState<string[]>([]);
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [topRatedOnly, setTopRatedOnly] = useState(false);
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const { viewMode, setViewMode } = useDiscoveryViewMode();
  const [selectedMapRestaurantId, setSelectedMapRestaurantId] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const skipPageReset = useRef(true);
  const { page, pageSize, setPage } = useUrlPagination({ defaultPageSize: 24 });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (skipPageReset.current) {
      skipPageReset.current = false;
      return;
    }
    setPage(1);
    setSelectedMapRestaurantId(null);
    // setPage is intentionally omitted — it changes when searchParams update and
    // would retrigger this effect in a router.replace loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, cuisine, activeCategoryIds, selectedLocation.lat, selectedLocation.lng, partySize, date, mapPriceRange, topRatedOnly, accessibleOnly, occasions, diningStyles, meals, dietaryTags, amenities]);

  useEffect(() => {
    document.documentElement.classList.toggle('rt-map-view', viewMode === 'map');
    return () => document.documentElement.classList.remove('rt-map-view');
  }, [viewMode]);

  const activeCategories = useMemo(
    () => RESTAURANT_DISCOVERY_CATEGORIES.filter((c) => activeCategoryIds.includes(c.id)),
    [activeCategoryIds],
  );

  const searchQuery = debouncedQuery || undefined;

  const applyLocation = useCallback((location: LocationSelection, fromDevice = false) => {
    setSelectedLocation(location);
    setLocationInput(location.label);
    setUsingDeviceLocation(fromDevice);
  }, []);

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
    setSelectedLocation({
      label: cityLabel(DEFAULT_LOCATION),
      lat: DEFAULT_LOCATION.lat,
      lng: DEFAULT_LOCATION.lng,
    });
    setUsingDeviceLocation(false);
  }, []);

  // Search runs live as filters change; the CTA flushes the debounce and
  // brings the results into view so the button always "does something".
  const handleSearch = useCallback(() => {
    setDebouncedQuery(query);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [query]);

  const datePresets = useMemo(
    () => [
      { label: 'Today', value: dayjs() },
      { label: 'Tomorrow', value: dayjs().add(1, 'day') },
      { label: 'This weekend', value: dayjs().day() === 0 ? dayjs() : dayjs().day(6) },
    ],
    [],
  );

  const dateStr = date.format('YYYY-MM-DD');

  const { data, loading } = useQuery(SEARCH_RESTAURANTS, {
    variables: {
      input: {
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
        page,
        limit: pageSize,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        radiusKm: NEARBY_RADIUS_KM,
        city: selectedLocation.city,
        neighborhood: selectedLocation.neighborhood,
      },
    },
  });

  const restaurants = (data as any)?.searchRestaurants?.items ?? [];
  const total = (data as any)?.searchRestaurants?.total ?? 0;

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
      debouncedQuery ||
      cuisine,
  );

  const visibleTotal = total;
  const noResults = !loading && restaurants.length === 0;
  const noVisibleResults = !loading && visibleRestaurants.length === 0;

  // Fallback: when nothing matches (e.g. no restaurants near the user's
  // location), surface the top 20 restaurants platform-wide instead.
  const { data: topData, loading: topLoading } = useQuery(SEARCH_RESTAURANTS, {
    variables: { input: { partySize, date: dateStr, page: 1, limit: 20 } },
    skip: !noResults,
  });
  const topRestaurants = (topData as any)?.searchRestaurants?.items ?? [];

  const resultsTitle = usingDeviceLocation
    ? 'Restaurants near you'
    : `Restaurants near ${selectedLocation.label.split(',').slice(0, 2).join(',').trim()}`;

  const clearCategoryFilters = useCallback(() => {
    setActiveCategoryIds([]);
    setCuisine(undefined);
  }, []);

  const clearMapFilters = useCallback(() => {
    clearCategoryFilters();
    setMapPriceRange(undefined);
    setOccasions([]);
    setDiningStyles([]);
    setMeals([]);
    setDietaryTags([]);
    setAmenities([]);
    setTopRatedOnly(false);
    setAccessibleOnly(false);
    setQuery('');
    setDebouncedQuery('');
    setSelectedMapRestaurantId(null);
  }, [clearCategoryFilters]);

  const handleCuisineChange = useCallback((value: string | undefined) => {
    setCuisine(value);
    if (value) {
      const match = RESTAURANT_DISCOVERY_CATEGORIES.find((c) => 'cuisine' in c && c.cuisine === value);
      setActiveCategoryIds(match ? [match.id] : []);
    } else {
      setActiveCategoryIds([]);
    }
  }, []);

  const handleCategoryIdsChange = useCallback((ids: string[]) => {
    setActiveCategoryIds(ids);
    const cuisineCategory =
      ids.length === 1
        ? RESTAURANT_DISCOVERY_CATEGORIES.find((c) => c.id === ids[0] && 'cuisine' in c)
        : undefined;
    setCuisine(
      cuisineCategory && 'cuisine' in cuisineCategory ? cuisineCategory.cuisine : undefined,
    );
    if (ids.length > 0) {
      setQuery('');
      setDebouncedQuery('');
    }
    setSelectedMapRestaurantId(null);
  }, []);

  const handleCategorySelect = useCallback((categoryId: string) => {
    setActiveCategoryIds((prev) => {
      const next = prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId];
      const cuisineCategory = RESTAURANT_DISCOVERY_CATEGORIES.find(
        (c) => next.length === 1 && next[0] === c.id && 'cuisine' in c,
      );
      setCuisine(cuisineCategory && 'cuisine' in cuisineCategory ? cuisineCategory.cuisine : undefined);
      if (next.length > 0) {
        setQuery('');
        setDebouncedQuery('');
      }
      setSelectedMapRestaurantId(null);
      return next;
    });
  }, []);

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

  const mapFiltersSidebar = (
    <MapFiltersSidebar
      categories={RESTAURANT_DISCOVERY_CATEGORIES.map((category) => ({
        id: category.id,
        label: category.label,
        icon: CATEGORY_ICONS[category.id],
      }))}
      filters={{
        categoryIds: activeCategoryIds,
        priceRange: mapPriceRange,
        occasions,
        diningStyles,
        meals,
        dietaryTags,
        amenities,
        topRatedOnly,
        accessibleOnly,
      }}
      onCategoryIdsChange={handleCategoryIdsChange}
      onPriceRangeChange={setMapPriceRange}
      onOccasionsChange={setOccasions}
      onDiningStylesChange={setDiningStyles}
      onMealsChange={setMeals}
      onDietaryTagsChange={setDietaryTags}
      onAmenitiesChange={setAmenities}
      onTopRatedChange={setTopRatedOnly}
      onAccessibleChange={setAccessibleOnly}
      onClearAll={clearMapFilters}
    />
  );

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

  const renderMapResults = (items: any[], resultTotal: number, title: string, isFallback = false) => (
    <MapResultsLayout
      restaurants={items}
      center={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
      selectedId={selectedMapRestaurantId}
      date={dateStr}
      partySize={partySize}
      total={resultTotal}
      page={page}
      pageSize={pageSize}
      resultsTitle={title}
      activeCategoryLabel={
        activeCategories.length > 0
          ? activeCategories.map((c) => c.label).join(', ')
          : undefined
      }
      filtersSidebar={mapFiltersSidebar}
      onPageChange={setPage}
      onSelectRestaurant={setSelectedMapRestaurantId}
      onCloseRestaurant={() => setSelectedMapRestaurantId(null)}
      onOpenRestaurant={(id) => openRestaurant(items, id)}
      onSelectSlot={(id, time) => bookRestaurantSlot(items, id, time)}
      onClearCategory={isFallback ? undefined : clearMapFilters}
    />
  );

  const discoverySearch = (variant: 'hero' | 'map') => (
    <DiscoverySearchPanel
      variant={variant}
      query={query}
      cuisine={cuisine}
      locationInput={locationInput}
      usingDeviceLocation={usingDeviceLocation}
      partySize={partySize}
      date={date}
      geoLoading={geoLoading}
      datePresets={datePresets}
      onQueryChange={setQuery}
      onCuisineChange={handleCuisineChange}
      onLocationInputChange={setLocationInput}
      onSelectLocation={(loc) => applyLocation(loc)}
      onUseMyLocation={requestLocation}
      onClearLocation={clearLocation}
      onClearDeviceLocation={clearDeviceLocation}
      onDateChange={setDate}
      onPartySizeChange={setPartySize}
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
      {viewMode !== 'map' && (
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
      )}

      {viewMode === 'map' ? (
        <div className="rt-map-page">
          <div className="rt-map-page__search-bar">
            <div className="rt-map-page__search-inner">
              {discoverySearch('map')}
            </div>
            <div className="rt-map-page__search-actions">{viewToggle}</div>
          </div>
          <div className="rt-map-page__content">
            {loading ? (
              <div className="rt-map-page__loading">
                <Skeleton active paragraph={{ rows: 8 }} />
              </div>
            ) : visibleRestaurants.length > 0 ? (
              renderMapResults(visibleRestaurants, visibleTotal, resultsTitle)
            ) : hasDiscoveryFilters ? (
              <div className="rt-map-page__empty">
                <EmptyState
                  icon={<SearchOutlined />}
                  title="No restaurants match your filters"
                  description="Try a different category, price range, or location."
                />
              </div>
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
      <div
        style={{
          maxWidth: layout.contentMaxWidth,
          width: '100%',
          margin: '0 auto',
          padding: '0 24px 32px',
        }}
      >
      <div
        className="rt-scroll-hidden"
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          padding: '28px 2px 4px',
        }}
      >
        {RESTAURANT_DISCOVERY_CATEGORIES.map((category) => {
          const active = activeCategoryIds.includes(category.id);
          return (
            <button
              key={category.id}
              type="button"
              className={active ? 'rt-chip rt-chip--active' : 'rt-chip'}
              onClick={() => handleCategorySelect(category.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                padding: '9px 16px',
                borderRadius: radii.pill,
                border: `1.5px solid ${active ? colors.brand[600] : colors.border}`,
                background: active ? colors.brand[600] : colors.surface,
                color: active ? '#fff' : colors.textSecondary,
                boxShadow: active ? shadows.brand : shadows.xs,
                transition: 'all 0.18s ease',
              }}
            >
              <span style={{ display: 'inline-flex', fontSize: 14, opacity: active ? 1 : 0.75 }}>
                {CATEGORY_ICONS[category.id]}
              </span>
              {category.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginTop: 20,
        }}
      >
        {viewToggle}
      </div>

      <div ref={resultsRef} style={{ marginTop: 28, scrollMarginTop: 84 }}>
        {loading ? (
          <>
            <Skeleton.Input active style={{ width: 260, height: 30, marginBottom: 20 }} />
            <SkeletonGrid count={8} />
          </>
        ) : restaurants.length > 0 ? (
          <>
            <SectionHeader
              icon={<EnvironmentFilled />}
              title={resultsTitle}
              subtitle={`${total} restaurant${total === 1 ? '' : 's'} within ${NEARBY_RADIUS_KM} km`}
            />
            {renderGrid(restaurants)}
            {total > pageSize && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={total}
                  onChange={setPage}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
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
              <>
                <SectionHeader
                  icon={<CrownFilled />}
                  title="Top 20 restaurants"
                  subtitle="The highest-rated places across Tablevera"
                />
                {renderGrid(topRestaurants)}
              </>
            ) : (
              <EmptyState
                icon={<SearchOutlined />}
                title="No restaurants yet"
                description="New restaurants join Tablevera every week — check back soon."
              />
            )}
          </>
        )}
      </div>
      </div>
      )}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div component="SectionHeader" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: radii.md,
          background: colors.brand[50],
          color: colors.brand[600],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <Title level={3} style={{ margin: 0, letterSpacing: typography.letterSpacing.tight }}>
          {title}
        </Title>
        {subtitle && (
          <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
            {subtitle}
          </Text>
        )}
      </div>
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
      photoUrl={restaurant.photos?.[0]}
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
