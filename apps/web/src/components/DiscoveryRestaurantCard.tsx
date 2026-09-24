'use client';

import Image from 'next/image';
import {
  RestaurantCard,
  type RestaurantCardProps,
  type RestaurantCardPhotoRenderProps,
} from '@reservations/ui';
import { canUseNextImage } from '@/lib/canUseNextImage';

export function DiscoveryRestaurantCard(props: RestaurantCardProps) {
  return (
    <RestaurantCard
      {...props}
      renderPhoto={({ src, alt, style, onError }: RestaurantCardPhotoRenderProps) =>
        canUseNextImage(src) ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ ...style, position: 'absolute' }}
            onError={onError}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} loading="lazy" decoding="async" onError={onError} style={style} />
        )
      }
    />
  );
}
