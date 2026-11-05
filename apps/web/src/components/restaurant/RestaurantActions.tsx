'use client';

import { Button } from 'antd';
import {
  CompassOutlined,
  GlobalOutlined,
  MessageOutlined,
  PhoneOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import type { Address } from '@/lib/restaurantLinks';
import { buildDirectionsUrl, normalizeHttpUrl } from '@/lib/restaurantLinks';

type Props = {
  address: Address;
  location?: { lat: number; lng: number } | null;
  phone?: string | null;
  website?: string | null;
  /** Tracked ordering link from the API; null when the restaurant turned ordering off. */
  onlineOrderLink?: string | null;
  onMessage: () => void;
};

export function RestaurantActions({
  address,
  location,
  phone,
  website,
  onlineOrderLink,
  onMessage,
}: Props) {
  const directionsUrl = buildDirectionsUrl(address, location);
  const tel = phone?.trim() ? `tel:${phone.replace(/[^\d+]/g, '')}` : null;
  const site = normalizeHttpUrl(website);

  return (
    <div className="rt-restaurant-actions">
      {onlineOrderLink ? (
        <a
          href={onlineOrderLink}
          target="_blank"
          rel="noopener noreferrer"
          className="rt-restaurant-actions__btn rt-restaurant-actions__btn--order"
        >
          <ShoppingCartOutlined aria-hidden />
          <span>Order online</span>
          <span className="rt-restaurant-actions__btn-hint">· Takeout &amp; delivery</span>
        </a>
      ) : null}
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
