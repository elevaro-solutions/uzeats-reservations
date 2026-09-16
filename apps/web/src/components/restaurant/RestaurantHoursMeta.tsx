'use client';

import { Typography } from 'antd';
import { ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import {
  formatBookingHours,
  hoursStatus,
  type ShiftHoursInput,
} from '@reservations/shared';

const { Text } = Typography;

type Props = {
  shifts: ShiftHoursInput[];
  timeZone: string;
};

export function RestaurantHoursMeta({ shifts, timeZone }: Props) {
  const status = hoursStatus(shifts, timeZone);
  const bookingHours = formatBookingHours(shifts, timeZone);
  if (!status && !bookingHours) return null;

  return (
    <div className="rt-restaurant-hours-meta">
      {status ? (
        <Text
          className={`rt-restaurant-hours-meta__row${status.open ? ' rt-restaurant-hours-meta__row--open' : ''}`}
        >
          <ClockCircleOutlined aria-hidden />
          <span>
            <span className="rt-restaurant-hours-meta__label">Hours</span>
            {status.label}
          </span>
        </Text>
      ) : null}
      {bookingHours ? (
        <Text className="rt-restaurant-hours-meta__row">
          <CalendarOutlined aria-hidden />
          <span>
            <span className="rt-restaurant-hours-meta__label">Reservations</span>
            {bookingHours}
          </span>
        </Text>
      ) : null}
    </div>
  );
}
