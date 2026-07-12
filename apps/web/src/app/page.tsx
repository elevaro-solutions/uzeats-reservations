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
  Space,
  Tag,
  Tooltip,
  Typography,
  Spin,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { RestaurantCard, EmptyState, colors, radii, shadows, typography } from '@reservations/ui';
import { AimOutlined, CloseOutlined, EnvironmentFilled, SearchOutlined } from '@ant-design/icons';
import { CUISINES } from '@reservations/shared';
import { SEARCH_RESTAURANTS, AVAILABILITY } from '@/lib/graphql';

const { Title, Paragraph, Text } = Typography;

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [cuisine, setCuisine] = useState<string | undefined>();
  const [city, setCity] = useState('New York');
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState(dayjs().add(1, 'day'));
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

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

  const { data, loading } = useQuery(SEARCH_RESTAURANTS, {
    variables: {
      input: {
        query: query || undefined,
        cuisine,
        city: geoLocation ? undefined : city || undefined,
        partySize,
        date: date.format('YYYY-MM-DD'),
        page: 1,
        limit: 24,
        ...(geoLocation ? { lat: geoLocation.lat, lng: geoLocation.lng, radiusKm: 16 } : {}),
      },
    },
  });

  const restaurants = (data as any)?.searchRestaurants?.items ?? [];

  return (
    <Space orientation="vertical" size={32} style={{ width: '100%' }}>
      <div
        style={{
          background: `linear-gradient(140deg, ${colors.neutral[900]} 0%, #3d1f22 55%, ${colors.brand[800]} 100%)`,
          borderRadius: radii.xl,
          padding: '48px 40px 40px',
          boxShadow: shadows.lg,
        }}
      >
        <Text
          style={{
            color: colors.brand[300],
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            textTransform: 'uppercase',
            letterSpacing: typography.letterSpacing.wide,
          }}
        >
          Book a table in seconds
        </Text>
        <Title
          style={{
            color: '#fff',
            marginTop: 8,
            marginBottom: 0,
            fontSize: typography.fontSize.display,
            letterSpacing: typography.letterSpacing.tight,
            maxWidth: 640,
          }}
        >
          Find your table for any occasion
        </Title>
        <Paragraph
          style={{
            color: 'rgba(255,255,255,0.75)',
            maxWidth: 560,
            marginTop: 12,
            fontSize: typography.fontSize.md,
          }}
        >
          Search restaurants across the USA and book instantly — birthdays, date nights, business
          dinners, and more.
        </Paragraph>
        <div
          style={{
            marginTop: 24,
            background: '#fff',
            borderRadius: radii.lg,
            padding: 12,
            boxShadow: shadows.md,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
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
              color="#da3743"
              closable
              onClose={clearLocation}
              style={{
                height: 40,
                display: 'flex',
                alignItems: 'center',
                fontSize: 14,
                padding: '0 12px',
                borderRadius: 8,
              }}
            >
              <EnvironmentFilled style={{ marginRight: 4 }} /> Near me
            </Tag>
          ) : (
            <Input
              size="large"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{ flex: '1 1 120px', minWidth: 110 }}
              variant="filled"
            />
          )}
          <Tooltip title={geoLocation ? 'Location active' : 'Find restaurants near me'}>
            <Button
              size="large"
              icon={<AimOutlined />}
              loading={geoLoading}
              onClick={geoLocation ? clearLocation : requestLocation}
              type={geoLocation ? 'primary' : 'default'}
              style={geoLocation ? { background: '#da3743', borderColor: '#da3743' } : {}}
            />
          </Tooltip>
          <DatePicker
            size="large"
            value={date}
            onChange={(d) => d && setDate(d)}
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
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <Spin size="large" />
        </div>
      ) : restaurants.length === 0 ? (
        <EmptyState
          icon={<SearchOutlined />}
          title="No restaurants found"
          description="Try a different city, cuisine, or date — new restaurants join ReserveTable every week."
        />
      ) : (
        <Row gutter={[20, 20]}>
          {restaurants.map((r: any) => (
            <Col key={r.id} xs={24} sm={12} lg={8}>
              <RestaurantWithSlots
                restaurant={r}
                date={date.format('YYYY-MM-DD')}
                partySize={partySize}
                onOpen={() => router.push(`/restaurants/${r.id}`)}
                onSelectSlot={(time) =>
                  router.push(
                    `/restaurants/${r.id}?date=${date.format('YYYY-MM-DD')}&party=${partySize}&slot=${encodeURIComponent(time)}`,
                  )
                }
              />
            </Col>
          ))}
        </Row>
      )}
    </Space>
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
