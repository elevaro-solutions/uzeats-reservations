import type { InquiryDetail } from "../components/inquiry-detail-sheet.component";

export type InboxFilter = "all" | "conversations" | "inquiries";

export type Conversation = {
  reservationId: string;
  unreadCount: number;
  diner?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  reservation?: {
    slotStart?: string | null;
    partySize?: number | null;
  } | null;
  lastMessage?: {
    body?: string | null;
    createdAt?: string | null;
  } | null;
};

export type Inquiry = InquiryDetail & {
  readAt?: string | null;
};

export type InboxItem =
  | { kind: "conversation"; sortAt: string; conversation: Conversation }
  | { kind: "inquiry"; sortAt: string; inquiry: Inquiry };

export function mergeInboxItems(
  conversations: Conversation[],
  inquiries: Inquiry[],
): InboxItem[] {
  const items: InboxItem[] = [
    ...conversations.map((conversation) => ({
      kind: "conversation" as const,
      sortAt:
        conversation.lastMessage?.createdAt ??
        conversation.reservation?.slotStart ??
        "",
      conversation,
    })),
    ...inquiries.map((inquiry) => ({
      kind: "inquiry" as const,
      sortAt: inquiry.createdAt,
      inquiry,
    })),
  ];

  return items.sort(
    (a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime(),
  );
}

export function filterInboxItems(
  items: InboxItem[],
  filter: InboxFilter,
): InboxItem[] {
  return items.filter((item) => {
    if (filter === "conversations") return item.kind === "conversation";
    if (filter === "inquiries") return item.kind === "inquiry";
    return true;
  });
}

export function inboxEmptyCopy(filter: InboxFilter): {
  title: string;
  description: string;
} {
  if (filter === "conversations") {
    return {
      title: "No conversations",
      description: "Guest reservation messages will show up here.",
    };
  }
  if (filter === "inquiries") {
    return {
      title: "No inquiries",
      description: "Website inquiries will show up here.",
    };
  }
  return {
    title: "No messages",
    description:
      "Guest conversations and website inquiries will show up here.",
  };
}

export function countUnreadConversations(conversations: Conversation[]): number {
  return conversations.filter((item) => item.unreadCount > 0).length;
}

export function countUnreadInquiries(inquiries: Inquiry[]): number {
  return inquiries.filter((item) => !item.readAt).length;
}
