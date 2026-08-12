'use client';

import { Typography } from 'antd';
import {
  EnvironmentOutlined,
  PhoneOutlined,
  GlobalOutlined,
  DollarOutlined,
  CoffeeOutlined,
  TagOutlined,
  CarOutlined,
  TeamOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { priceRangeLabel } from '@reservations/ui';
import { buildDirectionsUrl, buildMapsSearchUrl, formatRestaurantAddress } from '@/lib/restaurantLinks';

const { Title, Text } = Typography;

type Address = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zip: string;
  neighborhood?: string | null;
};

type Props = {
  address: Address;
  phone?: string | null;
  website?: string | null;
  cuisine: string;
  priceRange: number;
  diningStyles?: string[];
  amenities?: string[];
  meals?: string[];
  dietaryTags?: string[];
  wheelchairAccessible?: boolean;
  location?: { lat: number; lng: number } | null;
  openingHoursLines?: string[];
};

type DetailRow = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
};

export function RestaurantDetailsSection({
  address,
  phone,
  website,
  cuisine,
  priceRange,
  diningStyles = [],
  amenities = [],
  meals = [],
  dietaryTags = [],
  wheelchairAccessible,
  location,
  openingHoursLines = [],
}: Props) {
  const fullAddress = formatRestaurantAddress(address);

  const mapSrc =
    location?.lat && location?.lng
      ? `https://maps.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`
      : `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&z=15&output=embed`;

  const directionsUrl = buildDirectionsUrl(address, location);
  const mapsUrl = buildMapsSearchUrl(address, location);

  const rows: DetailRow[] = [
    {
      icon: <EnvironmentOutlined />,
      label: 'Location',
      value: (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rt-restaurant-link"
        >
          {fullAddress}
        </a>
      ),
    },
    phone
      ? {
          icon: <PhoneOutlined />,
          label: 'Phone',
          value: (
            <a href={`tel:${phone}`} className="rt-restaurant-link">
              {phone}
            </a>
          ),
        }
      : null,
    {
      icon: <DollarOutlined />,
      label: 'Price',
      value: priceRangeLabel(priceRange),
    },
    {
      icon: <CoffeeOutlined />,
      label: 'Cuisine',
      value: cuisine,
    },
    openingHoursLines.length > 0
      ? {
          icon: <ClockCircleOutlined />,
          label: 'Hours',
          value: (
            <div style={{ display: 'grid', gap: 2 }}>
              {openingHoursLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          ),
        }
      : null,
    address.neighborhood
      ? {
          icon: <EnvironmentOutlined />,
          label: 'Neighborhood',
          value: address.neighborhood,
        }
      : null,
    diningStyles.length > 0
      ? {
          icon: <TagOutlined />,
          label: 'Dining style',
          value: diningStyles.join(', '),
        }
      : null,
    meals.length > 0
      ? {
          icon: <ClockCircleOutlined />,
          label: 'Meals served',
          value: meals.join(', '),
        }
      : null,
    amenities.length > 0
      ? {
          icon: <CarOutlined />,
          label: 'Amenities',
          value: amenities.join(', '),
        }
      : null,
    dietaryTags.length > 0
      ? {
          icon: <TeamOutlined />,
          label: 'Dietary options',
          value: dietaryTags.join(', '),
        }
      : null,
    wheelchairAccessible
      ? {
          icon: <TeamOutlined />,
          label: 'Accessibility',
          value: 'Wheelchair accessible',
        }
      : null,
    website
      ? {
          icon: <GlobalOutlined />,
          label: 'Website',
          value: (
            <a href={website} target="_blank" rel="noopener noreferrer" className="rt-restaurant-link">
              {website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          ),
        }
      : null,
  ].filter(Boolean) as DetailRow[];

  return (
    <section id="details" className="rt-restaurant-section">
      <Title level={3} className="rt-restaurant-section__title">
        Details
      </Title>

      <div className="rt-restaurant-map">
        <iframe
          title={`Map of ${fullAddress}`}
          src={mapSrc}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rt-restaurant-map__directions"
        >
          Get directions
        </a>
      </div>

      <div className="rt-restaurant-details-grid">
        {rows.map((row) => (
          <div key={row.label} className="rt-restaurant-detail">
            <span className="rt-restaurant-detail__icon">{row.icon}</span>
            <div>
              <Text strong className="rt-restaurant-detail__label">
                {row.label}
              </Text>
              <div className="rt-restaurant-detail__value">{row.value}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
