'use client';

import { Button } from 'antd';
import {
  CompassOutlined,
  GlobalOutlined,
  MessageOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import type { Address } from '@/lib/restaurantLinks';
import { buildDirectionsUrl } from '@/lib/restaurantLinks';

type Props = {
  address: Address;
  location?: { lat: number; lng: number } | null;
  phone?: string | null;
  website?: string | null;
  onMessage: () => void;
};

function normalizeWebsite(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function RestaurantActions({
  address,
  location,
  phone,
  website,
  onMessage,
}: Props) {
  const directionsUrl = buildDirectionsUrl(address, location);
  const tel = phone?.trim() ? `tel:${phone.replace(/[^\d+]/g, '')}` : null;
  const site = website?.trim() ? normalizeWebsite(website) : null;

  return (
    <div className="rt-restaurant-actions">
      {tel ? (
        <a href={tel} className="rt-restaurant-actions__tile">
          <PhoneOutlined aria-hidden />
          <span>Call</span>
        </a>
      ) : null}
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rt-restaurant-actions__tile"
      >
        <CompassOutlined aria-hidden />
        <span>Directions</span>
      </a>
      {site ? (
        <a
          href={site}
          target="_blank"
          rel="noopener noreferrer"
          className="rt-restaurant-actions__tile"
        >
          <GlobalOutlined aria-hidden />
          <span>Website</span>
        </a>
      ) : null}
      <Button
        type="text"
        className="rt-restaurant-actions__tile rt-restaurant-actions__tile--btn"
        icon={<MessageOutlined />}
        onClick={onMessage}
      >
        Message
      </Button>
    </div>
  );
}
