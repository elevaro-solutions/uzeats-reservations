'use client';

import { Select } from 'antd';
import type { PartnerRestaurant } from '@/lib/usePartnerRestaurant';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';

type Props = {
  restaurants: PartnerRestaurant[];
  width?: number;
  style?: React.CSSProperties;
};

export default function PartnerRestaurantSelect({
  restaurants,
  width = 320,
  style,
}: Props) {
  const { restaurantSelectProps } = usePartnerRestaurant(restaurants);

  return <Select style={{ width, ...style }} {...restaurantSelectProps} />;
}
