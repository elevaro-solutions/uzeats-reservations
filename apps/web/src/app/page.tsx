'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Col,
  DatePicker,
  Input,
  Pagination,
  Row,
  Select,
  Skeleton,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { RestaurantCard, EmptyState, colors, layout, radii, shadows, typography } from '@reservations/ui';
import {
  CrownFilled,
  EnvironmentFilled,
  GlobalOutlined,
  SearchOutlined,
  StarFilled,
  TagFilled,
  ThunderboltFilled,
} from '@ant-design/icons';
import { buildRestaurantBookingPath } from '@reservations/shared';
import { SEARCH_RESTAURANTS, AVAILABILITY } from '@/lib/graphql';
import { useUrlPagination } from '@/lib/useUrlPagination';
import { DEFAULT_LOCATION, cityLabel } from '@/lib/cities';
import {
  AddressAutocomplete,
  type LocationSelection,
} from '@/components/AddressAutocomplete';

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

function HomePageContent() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [cuisine, setCuisine] = useState<string | undefined>();
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
  const [showMap, setShowMap] = useState(false);
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
  }, [debouncedQuery, cuisine, selectedLocation.lat, selectedLocation.lng, partySize, date, setPage]);

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
        query: debouncedQuery || undefined,
        cuisine,
        partySize,
        date: dateStr,
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
    : `Restaurants near ${selectedLocation.label.split(',').slice(0, 2).join(',').trim()}`;

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
      {/* ---------- Hero (full-bleed) ---------- */}
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

          {/* search panel */}
          <div
            className="rt-fade-up rt-search-panel"
            role="search"
            style={{ animationDelay: '180ms' }}
          >
            <div className="rt-search-field rt-sf-what">
              <span className="rt-search-label">Search</span>
              <Input
                size="large"
                variant="borderless"
                allowClear
                prefix={<SearchOutlined style={{ color: colors.textTertiary }} />}
                placeholder="Restaurant name or dish"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onPressEnter={handleSearch}
              />
            </div>
            <span className="rt-search-divider" aria-hidden />
            <div className="rt-search-field rt-sf-cuisine">
              <span className="rt-search-label">Cuisine</span>
              <Select
                size="large"
                variant="borderless"
                allowClear
                placeholder="Any cuisine"
                value={cuisine}
                onChange={setCuisine}
                options={CUISINES.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <span className="rt-search-divider" aria-hidden />
            <div className="rt-search-field rt-sf-where">
              <span className="rt-search-label">Where</span>
              {usingDeviceLocation ? (
                <Tag
                  color={colors.brand[600]}
                  closable
                  onClose={clearDeviceLocation}
                  style={{
                    height: 40,
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: 14,
                    padding: '0 12px',
                    borderRadius: radii.md,
                    margin: '0 4px 2px',
                  }}
                >
                  <EnvironmentFilled style={{ marginRight: 6 }} /> Near me — closest tables first
                </Tag>
              ) : (
                <AddressAutocomplete
                  value={locationInput}
                  onChange={setLocationInput}
                  onSelectLocation={(loc) => applyLocation(loc)}
                  onUseMyLocation={requestLocation}
                  onClear={clearLocation}
                  geoLoading={geoLoading}
                  variant="borderless"
                />
              )}
            </div>
            <span className="rt-search-divider" aria-hidden />
            <div className="rt-search-field rt-sf-when">
              <span className="rt-search-label">When</span>
              <DatePicker
                size="large"
                variant="borderless"
                value={date}
                onChange={(d) => d && setDate(d)}
                allowClear={false}
                format="ddd, MMM D"
                disabledDate={(d) => d.isBefore(dayjs().startOf('day'))}
                presets={datePresets}
              />
            </div>
            <span className="rt-search-divider" aria-hidden />
            <div className="rt-search-field rt-sf-who">
              <span className="rt-search-label">Guests</span>
              <Select
                size="large"
                variant="borderless"
                value={partySize}
                onChange={(v) => setPartySize(v ?? 2)}
                options={Array.from({ length: 20 }, (_, i) => ({
                  value: i + 1,
                  label: `${i + 1} ${i === 0 ? 'guest' : 'guests'}`,
                }))}
              />
            </div>
            <div className="rt-search-submit">
              <Button
                type="primary"
                size="large"
                icon={<SearchOutlined />}
                className="rt-hero-cta"
                onClick={handleSearch}
                style={{
                  height: 'auto',
                  minHeight: 52,
                  borderRadius: radii.lg,
                  fontWeight: typography.fontWeight.semibold,
                  paddingInline: 26,
                  background: colors.brand[600],
                  boxShadow: shadows.brand,
                }}
              >
                Find a table
              </Button>
            </div>
          </div>

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
        style={{
          maxWidth: layout.contentMaxWidth,
          width: '100%',
          margin: '0 auto',
          padding: '0 24px 32px',
        }}
      >
      {/* ---------- Cuisine quick filters ---------- */}
      <div
        className="rt-scroll-hidden"
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          padding: '28px 2px 4px',
        }}
      >
        {CUISINES.map((c) => {
          const active = cuisine === c;
          return (
            <button
              key={c}
              type="button"
              className={active ? 'rt-chip rt-chip--active' : 'rt-chip'}
              onClick={() => setCuisine(active ? undefined : c)}
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
              {c}
            </button>
          );
        })}
      </div>

      {/* ---------- View toggle ---------- */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginTop: 20,
          gap: 8,
        }}
      >
        <Button
          icon={<GlobalOutlined />}
          type={showMap ? 'primary' : 'default'}
          onClick={() => setShowMap((v) => !v)}
          style={{
            borderRadius: radii.pill,
            fontWeight: typography.fontWeight.semibold,
            ...(showMap ? { background: colors.brand[600] } : {}),
          }}
        >
          {showMap ? 'Hide map' : 'Show map'}
        </Button>
      </div>

      {/* ---------- Map view ---------- */}
      {showMap && (
        <div
          style={{
            marginTop: 16,
            height: 380,
            borderRadius: radii.lg,
            overflow: 'hidden',
            border: `1px solid ${colors.border}`,
            background: colors.neutral[100],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              color: colors.textSecondary,
            }}
          >
            <GlobalOutlined style={{ fontSize: 40, color: colors.textTertiary, display: 'block', marginBottom: 12 }} />
            <Text strong style={{ fontSize: typography.fontSize.md }}>Map view</Text>
            <br />
            <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
              Interactive map coming soon — browse restaurants by location
            </Text>
          </div>
        </div>
      )}

      {/* ---------- Results ---------- */}
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
            {/* Fallback: top 20 platform-wide */}
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
