function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getMessageDayKey(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatMessageDayLabel(iso: string): string {
  const date = startOfLocalDay(new Date(iso));
  const today = startOfLocalDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === yesterday.getTime()) return "Yesterday";

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Compact relative time for inbox rows (Just now / 5m / 2h / 3d). */
export function formatInboxRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "Just now";

  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatConversationWhen(slotStart: string): string {
  return new Date(slotStart).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatInquiryAbsoluteTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatUnreadSummary(
  unreadConversations: number,
  unreadInquiries: number,
): string {
  const parts: string[] = [];
  if (unreadConversations > 0) {
    parts.push(
      `${unreadConversations} unread conversation${unreadConversations === 1 ? "" : "s"}`,
    );
  }
  if (unreadInquiries > 0) {
    parts.push(
      `${unreadInquiries} unread inquir${unreadInquiries === 1 ? "y" : "ies"}`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : "You're all caught up";
}

export function isRestaurantSender(senderType: string): boolean {
  return (
    senderType === "restaurant" ||
    senderType === "staff" ||
    senderType === "owner"
  );
}

export function dinerDisplayName(diner?: {
  firstName?: string | null;
  lastName?: string | null;
} | null): string {
  return (
    [diner?.firstName, diner?.lastName].filter(Boolean).join(" ") || "Guest"
  );
}

export function splitDisplayName(name: string): {
  firstName: string;
  lastName: string;
} {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}
