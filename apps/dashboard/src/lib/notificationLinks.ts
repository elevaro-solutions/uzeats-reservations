export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export function parseNotificationData(data: string | null | undefined): Record<string, unknown> {
  if (!data) return {};
  try {
    const parsed = JSON.parse(data) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function asNotificationId(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function withRestaurantParam(path: string, data: Record<string, unknown>): string {
  const restaurantId = asNotificationId(data.restaurantId);
  if (!restaurantId) return path;
  const url = new URL(path, 'http://dashboard.local');
  url.searchParams.set('restaurant', restaurantId);
  return `${url.pathname}${url.search}`;
}

function reservationManageHref(data: Record<string, unknown>): string {
  const reservationId = asNotificationId(data.reservationId);
  const restaurantId = asNotificationId(data.restaurantId);
  if (reservationId) {
    return restaurantId
      ? `/reservations/${reservationId}?restaurant=${encodeURIComponent(restaurantId)}`
      : `/reservations/${reservationId}`;
  }
  if (restaurantId) return `/reservations?restaurant=${encodeURIComponent(restaurantId)}`;
  return '/reservations';
}

/** Partner Hub destination for a notification type + payload. */
export function notificationHref(n: Pick<AppNotification, 'type' | 'data'>): string {
  const data = parseNotificationData(n.data);
  const reservationId = asNotificationId(data.reservationId);

  switch (n.type) {
    case 'new_message':
      return withRestaurantParam(
        reservationId ? `/messages?reservationId=${encodeURIComponent(reservationId)}` : '/messages',
        data,
      );
    case 'restaurant_inquiry':
      return withRestaurantParam(
        asNotificationId(data.inquiryId)
          ? `/messages?inquiryId=${encodeURIComponent(asNotificationId(data.inquiryId)!)}`
          : '/messages',
        data,
      );
    case 'new_reservation':
    case 'reservation_confirmed':
    case 'reservation_reminder':
    case 'reservation_cancelled':
    case 'reservation_updated':
      return reservationManageHref(data);
    case 'waitlist_available':
    case 'waitlist_ready':
    case 'waitlist_notified':
    case 'waitlist_overdue':
      return withRestaurantParam('/waitlist', data);
    case 'guest_spend_alert':
      return reservationId ? reservationManageHref(data) : withRestaurantParam('/guests', data);
    case 'new_review':
    case 'review_reply':
    case 'review_report_response':
      return withRestaurantParam('/reviews', data);
    case 'invoice_ready':
      return withRestaurantParam('/billing', data);
    default:
      return '/notifications';
  }
}

export function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
