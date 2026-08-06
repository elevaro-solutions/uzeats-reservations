'use client';

import { Button } from 'antd';
import { CompassOutlined, MessageOutlined } from '@ant-design/icons';
import type { Address } from '@/lib/restaurantLinks';
import { buildDirectionsUrl } from '@/lib/restaurantLinks';

type Props = {
  address: Address;
  location?: { lat: number; lng: number } | null;
  onMessage: () => void;
};

export function RestaurantActions({ address, location, onMessage }: Props) {
  const directionsUrl = buildDirectionsUrl(address, location);

  return (
    <div className="rt-restaurant-actions">
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rt-restaurant-actions__btn rt-restaurant-actions__btn--primary"
      >
        <CompassOutlined />
        Get directions
      </a>
      <Button
        type="default"
        className="rt-restaurant-actions__btn"
        icon={<MessageOutlined />}
        onClick={onMessage}
      >
        Message restaurant
      </Button>
    </div>
  );
}
