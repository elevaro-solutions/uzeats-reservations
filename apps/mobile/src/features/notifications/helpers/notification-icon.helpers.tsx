import type { ComponentType, ReactElement } from "react";

import {
  AwardIcon,
  BellIcon,
  CalendarCheckIcon,
  CalendarIcon,
  CalendarPlusIcon,
  CalendarXIcon,
  CoinsIcon,
  MailIcon,
  ReceiptTextIcon,
  SparklesIcon,
  StarIcon,
} from "@/assets";
import type { IconPropsType } from "@/types";

export type NotificationIconTone =
  | "primary"
  | "info"
  | "success"
  | "accent"
  | "warning"
  | "error"
  | "muted";

const TYPE_ICONS: Record<string, ComponentType<IconPropsType>> = {
  new_message: MailIcon,
  new_reservation: CalendarPlusIcon,
  waitlist_available: BellIcon,
  waitlist_ready: BellIcon,
  waitlist_notified: BellIcon,
  saved_restaurant_available: SparklesIcon,
  guest_spend_alert: CoinsIcon,
  reservation_confirmed: CalendarCheckIcon,
  reservation_cancelled: CalendarXIcon,
  reservation_updated: CalendarIcon,
  reservation_reminder: CalendarCheckIcon,
  review_reply: StarIcon,
  survey_invitation: SparklesIcon,
  points_earned: AwardIcon,
  points_redeemed: CoinsIcon,
  points_refunded: CoinsIcon,
  restaurant_created: SparklesIcon,
  invoice_ready: ReceiptTextIcon,
};

const TYPE_TONES: Record<string, NotificationIconTone> = {
  new_message: "info",
  new_reservation: "primary",
  waitlist_available: "warning",
  waitlist_ready: "warning",
  waitlist_notified: "warning",
  saved_restaurant_available: "accent",
  guest_spend_alert: "accent",
  reservation_confirmed: "primary",
  reservation_cancelled: "error",
  reservation_updated: "primary",
  reservation_reminder: "primary",
  review_reply: "accent",
  survey_invitation: "accent",
  points_earned: "accent",
  points_redeemed: "accent",
  points_refunded: "accent",
  restaurant_created: "accent",
  invoice_ready: "muted",
};

export function getNotificationIconTone(type: string): NotificationIconTone {
  return TYPE_TONES[type] ?? "primary";
}

export function getNotificationIcon(
  type: string,
  props: IconPropsType,
): ReactElement {
  const Icon = TYPE_ICONS[type] ?? BellIcon;
  return <Icon {...props} />;
}
