import type { ReactElement } from "react";
import { ScrollView, type RefreshControlProps } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { MailIcon } from "@/assets";
import { Empty, Flex } from "@/components";

import { ConversationRow } from "./conversation-row.component";
import { InquiryRow } from "./inquiry-row.component";
import {
  dinerDisplayName,
  formatConversationWhen,
  formatInboxRelativeTime,
} from "../helpers/message-display.helpers";
import type {
  InboxItem,
  Inquiry,
} from "../helpers/messages-inbox.helpers";

export type MessagesInboxListProps = {
  items: InboxItem[];
  emptyTitle: string;
  emptyDescription: string;
  contentPaddingBottom: number;
  refreshControl: ReactElement<RefreshControlProps>;
  onPressConversation: (reservationId: string) => void;
  onPressInquiry: (inquiry: Inquiry) => void;
};

export function MessagesInboxList({
  items,
  emptyTitle,
  emptyDescription,
  contentPaddingBottom,
  refreshControl,
  onPressConversation,
  onPressInquiry,
}: MessagesInboxListProps) {
  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        items.length === 0 && styles.contentEmpty,
        { paddingBottom: contentPaddingBottom },
      ]}
      refreshControl={refreshControl}
    >
      {items.length === 0 ? (
        <Empty
          icon={<MailIcon />}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <Flex gap={1}>
          {items.map((item) => {
            if (item.kind === "conversation") {
              const conversation = item.conversation;
              const slotStart = conversation.reservation?.slotStart;
              const partySize = conversation.reservation?.partySize;
              const meta = slotStart
                ? [
                    formatConversationWhen(slotStart),
                    partySize ? `party of ${partySize}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : null;

              return (
                <ConversationRow
                  key={`conversation-${conversation.reservationId}`}
                  firstName={conversation.diner?.firstName}
                  lastName={conversation.diner?.lastName}
                  name={dinerDisplayName(conversation.diner)}
                  preview={
                    conversation.lastMessage?.body ?? "No messages yet"
                  }
                  meta={meta}
                  time={
                    conversation.lastMessage?.createdAt
                      ? formatInboxRelativeTime(
                          conversation.lastMessage.createdAt,
                        )
                      : null
                  }
                  unreadCount={conversation.unreadCount}
                  onPress={() =>
                    onPressConversation(conversation.reservationId)
                  }
                />
              );
            }

            const inquiry = item.inquiry;
            return (
              <InquiryRow
                key={`inquiry-${inquiry.id}`}
                senderName={inquiry.senderName}
                senderEmail={inquiry.senderEmail}
                message={inquiry.message}
                unread={!inquiry.readAt}
                time={formatInboxRelativeTime(inquiry.createdAt)}
                onPress={() => onPressInquiry(inquiry)}
              />
            );
          })}
        </Flex>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  content: {
    paddingHorizontal: space(2),
  },
  contentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
}));
