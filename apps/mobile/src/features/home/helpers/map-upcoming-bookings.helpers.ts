import type { BookingCarouselItem } from "../components/bookings-carousel.component";
import { formatSlotLabel } from "./format-slot-label.helpers";
import type { MyReservation } from "../types";

const ONE_HOUR_MS = 60 * 60 * 1000;

export function mapUpcomingBookings(
  reservations: MyReservation[],
  limit: number,
): BookingCarouselItem[] {
  const now = Date.now();
  return reservations
    .filter((r) => {
      if (r.status === "cancelled" || r.status === "no_show") return false;
      const t = new Date(r.slotStart).getTime();
      return Number.isFinite(t) && t >= now - ONE_HOUR_MS;
    })
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      restaurantId: r.restaurant.id,
      restaurantName: r.restaurant.name,
      photo: r.restaurant.photos?.[0],
      whenLabel: formatSlotLabel(r.slotStart),
      partySize: r.partySize,
    }));
}
