'use client';

import { Typography } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { formatBookingHours, type ShiftHoursInput } from '@reservations/shared';

const { Text } = Typography;

type Props = {
  shifts: ShiftHoursInput[];
  timeZone: string;
};

export function RestaurantHoursMeta({ shifts, timeZone }: Props) {
  const bookingHours = formatBookingHours(shifts, timeZone);
  if (!bookingHours) return null;

  return (
    <div className="rt-restaurant-hours-meta">
      <Text className="rt-restaurant-hours-meta__row">
        <CalendarOutlined aria-hidden />
        <span>
          <span className="rt-restaurant-hours-meta__label">Reservations</span>
          {bookingHours}
        </span>
      </Text>
    </div>
  );
}
