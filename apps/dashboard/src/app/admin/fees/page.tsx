'use client';

import { useMemo } from 'react';
import { useQuery } from '@/lib/apollo-hooks';
import {
  ADMIN_NO_SHOW_FEE_CHARGES,
  ADMIN_RESTAURANT_NAMES,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { NoShowFeeChargesReport } from '@/components/NoShowFeeChargesReport';

export default function AdminNoShowFeesPage() {
  const { ready } = useRequireAdmin();
  const { data } = useQuery(ADMIN_RESTAURANT_NAMES, {
    skip: !ready,
    variables: { limit: 200 },
  });

  const restaurantOptions = useMemo(
    () =>
      (data?.adminRestaurants?.items ?? []).map(
        (r: { id: string; name: string }) => ({
          value: r.id,
          label: r.name,
        }),
      ),
    [data],
  );

  if (!ready) return null;

  return (
    <NoShowFeeChargesReport
      mode="admin"
      query={ADMIN_NO_SHOW_FEE_CHARGES}
      restaurantOptions={restaurantOptions}
      showRestaurant
      detailBasePath="/admin/reservations"
      title="No-show fees"
      subtitle="All collected card-guarantee fees across restaurants. Charge, retry, or refund from the actions menu."
    />
  );
}
