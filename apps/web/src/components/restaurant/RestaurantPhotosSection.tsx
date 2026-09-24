'use client';

import { Typography } from 'antd';
import { DEFAULT_RESTAURANT_PHOTO } from '@reservations/ui';
import { canUseNextImage } from '@/lib/canUseNextImage';
import Image from 'next/image';

const { Title } = Typography;

type Props = {
  photos: string[];
  name: string;
  /** Open the shared gallery browser; pass an index to jump into the lightbox. */
  onOpenGallery?: (index?: number) => void;
};

export function RestaurantPhotosSection({ photos, name, onOpenGallery }: Props) {
  const gallery = photos.length > 0 ? photos : [DEFAULT_RESTAURANT_PHOTO];
  const count = photos.length;

  return (
    <section id="photos" className="rt-restaurant-section">
      <div className="rt-restaurant-photos-section__heading">
        <div>
          <Title level={3} className="rt-restaurant-section__title" style={{ marginBottom: 4 }}>
            {count > 0 ? `${count} Photos` : 'Photos'}
          </Title>
          <p className="rt-restaurant-photos-section__subtitle">
            Explore photos from {name}.
          </p>
        </div>
        {count > 0 && onOpenGallery && (
          <button
            type="button"
            className="rt-restaurant-photos-section__see-all"
            onClick={() => onOpenGallery()}
          >
            See all {count} {count === 1 ? 'photo' : 'photos'}
          </button>
        )}
      </div>
      <div className="rt-restaurant-photos-grid">
        {gallery.slice(0, 8).map((url, i) => (
          <button
            key={url + i}
            type="button"
            className="rt-restaurant-photos-grid__item"
            onClick={() => onOpenGallery?.(i)}
            aria-label={`View photo ${i + 1}`}
          >
            {canUseNextImage(url) ? (
              <Image
                src={url}
                alt={`${name} photo ${i + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={`${name} photo ${i + 1}`} loading="lazy" />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
