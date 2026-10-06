'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@/lib/apollo-hooks';
import { useAuth } from '@/lib/auth';
import { MY_RESTAURANTS, RESTAURANT_NO_SHOW_FEE_CHARGES } from '@/lib/graphql';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import { NoShowFeeChargesReport } from '@/components/NoShowFeeChargesReport';

export default function PartnerNoShowFeesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data: restaurantsData } = useQuery(MY_RESTAURANTS, {
    skip: !user,
  });
  const restaurants = restaurantsData?.myRestaurants ?? [];
  const { restaurantId } = usePartnerRestaurant(restaurants);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  if (!user) return null;

  return (
    <NoShowFeeChargesReport
      mode="partner"
      query={RESTAURANT_NO_SHOW_FEE_CHARGES}
      restaurantId={restaurantId}
      showRestaurant={restaurants.length > 1 && !restaurantId}
      detailBasePath="/reservations"
      title="No-show fees"
      subtitle="Collected card-guarantee fees for no-shows and late cancellations at this venue."
    />
  );
}
