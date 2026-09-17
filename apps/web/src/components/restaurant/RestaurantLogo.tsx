'use client';

import { pickRestaurantLogo, restaurantInitials } from '@reservations/ui';

type Props = {
  name: string;
  logoUrl?: string | null;
  photos?: string[] | null;
};

export function RestaurantLogo({ name, logoUrl, photos }: Props) {
  const dedicated = Boolean(logoUrl?.trim());
  const src = pickRestaurantLogo(logoUrl, photos);
  const initials = restaurantInitials(name);

  return (
    <div
      className={`rt-restaurant-logo${dedicated ? ' rt-restaurant-logo--mark' : ''}`}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : (
        <span className="rt-restaurant-logo__initials">{initials}</span>
      )}
    </div>
  );
}
