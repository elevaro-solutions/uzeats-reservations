'use client';

import Image from 'next/image';
import {
  RestaurantCard,
  type RestaurantCardProps,
  type RestaurantCardPhotoRenderProps,
} from '@reservations/ui';
import { canUseNextImage } from '@/lib/canUseNextImage';

function markLoadedIfDecoded(node: HTMLImageElement | null, onLoad: () => void) {
  if (node?.complete && node.naturalWidth > 0) onLoad();
}

export function DiscoveryRestaurantCard(props: RestaurantCardProps) {
  return (
    <RestaurantCard
      {...props}
      renderPhoto={({ src, alt, style, onError, onLoad }: RestaurantCardPhotoRenderProps) =>
        canUseNextImage(src) ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 575px) 120px, (max-width: 992px) 50vw, (max-width: 1200px) 33vw, 25vw"
            style={{ ...style, position: 'absolute' }}
            ref={(node) => markLoadedIfDecoded(node, onLoad)}
            onError={onError}
            onLoad={onLoad}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            ref={(node) => markLoadedIfDecoded(node, onLoad)}
            onError={onError}
            onLoad={onLoad}
            style={style}
          />
        )
      }
    />
  );
}
