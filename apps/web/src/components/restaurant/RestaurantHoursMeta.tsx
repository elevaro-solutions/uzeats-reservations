'use client';

import { Typography } from 'antd';
import { ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import {
  formatBookingHours,
  formatOpeningHoursLines,
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
  const scheduleLines = formatOpeningHoursLines(shifts, timeZone);
  if (!status && !bookingHours && scheduleLines.length === 0) return null;

  return (
    <div className="rt-restaurant-hours-meta">
      {status || scheduleLines.length > 0 ? (
        <div className="rt-restaurant-hours-meta__block">
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
          ) : (
            <Text className="rt-restaurant-hours-meta__row">
              <ClockCircleOutlined aria-hidden />
              <span className="rt-restaurant-hours-meta__label">Hours</span>
            </Text>
          )}
          {scheduleLines.length > 0 ? (
            <div className="rt-restaurant-hours-meta__schedule">
              {scheduleLines.map((line) => (
                <Text key={line} className="rt-restaurant-hours-meta__schedule-line">
                  {line}
                </Text>
              ))}
            </div>
          ) : null}
        </div>
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
