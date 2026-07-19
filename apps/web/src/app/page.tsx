'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Col,
  DatePicker,
  Input,
  Row,
  Select,
  Skeleton,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { RestaurantCard, EmptyState, colors, radii, shadows, typography } from '@reservations/ui';
import {
  AimOutlined,
  CheckCircleFilled,
  CrownFilled,
  EnvironmentFilled,
  GlobalOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { CUISINES } from '@reservations/shared';
import { SEARCH_RESTAURANTS, AVAILABILITY } from '@/lib/graphql';

const { Title, Paragraph, Text } = Typography;

const HERO_HIGHLIGHTS = [
  'Instant confirmation',
  'Free for diners',
  'Loyalty rewards',
] as const;

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [cuisine, setCuisine] = useState<string | undefined>();
  const [city, setCity] = useState('New York');
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState(dayjs().add(1, 'day'));
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      message.error('Geolocation is not supported by your browser');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setCity('');
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
  }, []);

  const clearLocation = useCallback(() => {
    setGeoLocation(null);
    setCity('New York');
  }, []);

  const dateStr = date.format('YYYY-MM-DD');

  const { data, loading } = useQuery(SEARCH_RESTAURANTS, {
    variables: {
      input: {
        query: query || undefined,
        cuisine,
        city: geoLocation ? undefined : city || undefined,
        partySize,
        date: dateStr,
        page: 1,
        limit: 24,
        ...(geoLocation ? { lat: geoLocation.lat, lng: geoLocation.lng, radiusKm: 16 } : {}),
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

  const resultsTitle = geoLocation
    ? 'Restaurants near you'
    : city
      ? `Top tables in ${city}`
      : 'Top restaurants';

  const renderGrid = (items: any[]) => (
    <Row gutter={[20, 20]}>
      {items.map((r: any, i: number) => (
        <Col key={r.id} xs={24} sm={12} md={8} lg={6} className="rt-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
          <RestaurantWithSlots
            restaurant={r}
            date={dateStr}
            partySize={partySize}
            onOpen={() => router.push(`/restaurants/${r.id}`)}
            onSelectSlot={(time) =>
              router.push(
                `/restaurants/${r.id}?date=${dateStr}&party=${partySize}&slot=${encodeURIComponent(time)}`,
              )
            }
          />
        </Col>
      ))}
    </Row>
  );

  return (
    <div>
      {/* ---------- Hero (full-bleed) ---------- */}
      <section
        style={{
          margin: '-32px calc(50% - 50vw) 0',
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(150deg, ${colors.neutral[900]} 0%, ${colors.heroMid} 45%, ${colors.brand[900]} 100%)`,
        }}
      >
        {/* decorative glows */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -160,
            right: '-8%',
            width: 520,
            height: 520,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(212, 90, 63, 0.38) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: -220,
            left: '-6%',
            width: 460,
            height: 460,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(240, 172, 154, 0.2) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent 75%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent 75%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: '72px 24px 56px',
            position: 'relative',
            textAlign: 'center',
          }}
        >
          <Title
            className="rt-fade-up"
            style={{
              color: '#fff',
              margin: '0 auto',
              fontSize: 'clamp(36px, 5vw, 52px)',
              lineHeight: 1.1,
              letterSpacing: typography.letterSpacing.tight,
              maxWidth: 720,
              fontWeight: typography.fontWeight.bold,
            }}
          >
            ReserveTable
          </Title>

          <Paragraph
            className="rt-fade-up"
            style={{
              color: 'rgba(255,255,255,0.78)',
              maxWidth: 480,
              margin: '14px auto 0',
              fontSize: typography.fontSize.md,
              lineHeight: 1.55,
              animationDelay: '80ms',
            }}
          >
            Find a table and book it in seconds — free for diners, anywhere in the USA.
          </Paragraph>

          {/* search panel */}
          <div
            className="rt-fade-up"
            style={{
              marginTop: 28,
              background: '#fff',
              borderRadius: radii.xl,
              padding: 10,
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.32)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center',
              textAlign: 'left',
              animationDelay: '140ms',
            }}
          >
            <Input
              size="large"
              prefix={<SearchOutlined style={{ color: colors.textTertiary }} />}
              placeholder="Restaurant or cuisine"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: '2 1 200px', minWidth: 180 }}
              variant="filled"
            />
            <Select
              size="large"
              allowClear
              placeholder="Cuisine"
              value={cuisine}
              onChange={setCuisine}
              style={{ flex: '1 1 140px', minWidth: 130 }}
              options={CUISINES.map((c) => ({ value: c, label: c }))}
              variant="filled"
            />
            {geoLocation ? (
              <Tag
                color={colors.brand[600]}
                closable
                onClose={clearLocation}
                style={{
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 14,
                  padding: '0 12px',
                  borderRadius: radii.sm,
                  margin: 0,
                }}
              >
                <EnvironmentFilled style={{ marginRight: 4 }} /> Near me
              </Tag>
            ) : (
              <Input
                size="large"
                prefix={<EnvironmentFilled style={{ color: colors.textTertiary }} />}
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{ flex: '1 1 130px', minWidth: 120 }}
                variant="filled"
              />
            )}
            <Tooltip title={geoLocation ? 'Location active — click to clear' : 'Find restaurants near me'}>
              <Button
                size="large"
                icon={<AimOutlined />}
                loading={geoLoading}
                onClick={geoLocation ? clearLocation : requestLocation}
                type={geoLocation ? 'primary' : 'default'}
              />
            </Tooltip>
            <DatePicker
              size="large"
              value={date}
              onChange={(d) => d && setDate(d)}
              allowClear={false}
              style={{ flex: '0 1 150px' }}
              variant="filled"
            />
            <Select
              size="large"
              value={partySize}
              onChange={(v) => setPartySize(v ?? 2)}
              style={{ flex: '0 1 140px', minWidth: 130 }}
              variant="filled"
              options={Array.from({ length: 20 }, (_, i) => ({
                value: i + 1,
                label: `${i + 1} ${i === 0 ? 'person' : 'people'}`,
              }))}
            />
            <Button
              type="primary"
              size="large"
              icon={<SearchOutlined />}
              style={{
                flex: '0 0 auto',
                height: 44,
                borderRadius: radii.md,
                fontWeight: typography.fontWeight.semibold,
                paddingInline: 24,
                background: colors.brand[600],
              }}
            >
              Find a table
            </Button>
          </div>

          {/* highlights */}
          <div
            className="rt-fade-up"
            style={{
              marginTop: 22,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '10px 28px',
              animationDelay: '220ms',
            }}
          >
            {HERO_HIGHLIGHTS.map((h) => (
              <span
                key={h}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'rgba(255,255,255,0.78)',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                }}
              >
                <CheckCircleFilled style={{ color: colors.brand[400] }} /> {h}
              </span>
            ))}
          </div>
        </div>
      </section>

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
      <div style={{ marginTop: 28 }}>
        {loading ? (
          <>
            <Skeleton.Input active style={{ width: 260, height: 30, marginBottom: 20 }} />
            <SkeletonGrid count={8} />
          </>
        ) : restaurants.length > 0 ? (
          <>
            <SectionHeader
              icon={geoLocation ? <EnvironmentFilled /> : <CrownFilled />}
              title={resultsTitle}
              subtitle={`${total} restaurant${total === 1 ? '' : 's'} ready to book`}
            />
            {renderGrid(restaurants)}
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
                  No restaurants found {geoLocation ? 'near your location' : 'for this search'}
                </Text>
                <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
                  Don&apos;t worry — here are the top 20 restaurants on ReserveTable, loved by
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
                  subtitle="The highest-rated places across ReserveTable"
                />
                {renderGrid(topRestaurants)}
              </>
            ) : (
              <EmptyState
                icon={<SearchOutlined />}
                title="No restaurants yet"
                description="New restaurants join ReserveTable every week — check back soon."
              />
            )}
          </>
        )}
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
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
      photoUrl={restaurant.photos?.[0]}
      availableSlots={slots}
      onClick={onOpen}
      onSelectSlot={(_, time) => onSelectSlot(time)}
    />
  );
}
