'use client';

import { Typography } from 'antd';
import { DEFAULT_RESTAURANT_PHOTO } from '@reservations/ui';

const { Title } = Typography;

type Props = {
  photos: string[];
  name: string;
};

export function RestaurantPhotosSection({ photos, name }: Props) {
  const gallery = photos.length > 0 ? photos : [DEFAULT_RESTAURANT_PHOTO];

  return (
    <section id="photos" className="rt-restaurant-section">
      <Title level={3} className="rt-restaurant-section__title">
        Photos
      </Title>
      <div className="rt-restaurant-photos-grid">
        {gallery.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={url + i} src={url} alt={`${name} photo ${i + 1}`} loading="lazy" />
        ))}
      </div>
    </section>
  );
}
