/** Known notification type strings rendered by the mobile icon/tone maps. */
export type KnownNotificationType =
  | "new_message"
  | "new_reservation"
  | "waitlist_available"
  | "waitlist_ready"
  | "waitlist_notified"
  | "saved_restaurant_available"
  | "guest_spend_alert"
  | "reservation_confirmed"
  | "reservation_cancelled"
  | "reservation_updated"
  | "reservation_reminder"
  | "review_reply"
  | "survey_invitation"
  | "points_earned"
  | "points_redeemed"
  | "points_refunded"
  | "restaurant_created"
  | "invoice_ready";

export type AppNotification = {
  id: string;
  /** Server may send types not yet in KnownNotificationType; UI falls back. */
  type: KnownNotificationType | (string & {});
  title: string;
  body: string;
  data?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type MyNotificationsQuery = {
  myNotifications: {
    items: AppNotification[];
    total: number;
  };
  unreadNotificationCount: number;
};
