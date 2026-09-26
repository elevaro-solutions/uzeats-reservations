import { PLATFORM_TIMEZONE } from "@reservations/shared";

import type { BookingCarouselItem } from "../components/bookings-carousel.component";
import {
  formatBookingCardAddress,
  formatBookingCardDate,
  formatBookingCardTimeRange,
} from "./format-slot-label.helpers";
import type { MyReservation } from "../types";

const ONE_HOUR_MS = 60 * 60 * 1000;

export function mapUpcomingBookings(
  reservations: MyReservation[],
  limit: number,
): BookingCarouselItem[] {
  const now = Date.now();
  return reservations
    .filter((r) => {
      if (!r?.restaurant?.id) return false;
      if (r.status === "cancelled" || r.status === "no_show") return false;
      const t = new Date(r.slotStart).getTime();
      return Number.isFinite(t) && t >= now - ONE_HOUR_MS;
    })
    .slice()
    .sort(
      (a, b) =>
        new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime(),
    )
    .slice(0, limit)
    .map((r) => {
      const timeZone = r.restaurant.timezone ?? PLATFORM_TIMEZONE;
      return {
        id: r.id,
        restaurantId: r.restaurant.id,
        restaurantName: r.restaurant.name,
        photo: r.restaurant.photos?.[0],
        addressLabel: formatBookingCardAddress(r.restaurant.address),
        dateLabel: formatBookingCardDate(r.slotStart, timeZone),
        timeLabel: formatBookingCardTimeRange(r.slotStart, r.slotEnd, timeZone),
        partySize: r.partySize,
      };
    });
}
