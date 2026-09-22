import { useMutation, useQuery } from "@apollo/client";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { MailIcon } from "@/assets";
import {
  Empty,
  Flex,
  InlineAlert,
  SegmentedControl,
  Typography,
} from "@/components";
import { useActiveRestaurant } from "@/features/restaurants";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

import {
  CONVERSATIONS,
  MARK_RESTAURANT_INQUIRY_READ,
  RESTAURANT_INQUIRIES,
} from "./api/messages.operations";
import { ConversationRow } from "./components/conversation-row.component";
import {
  InquiryDetailSheet,
  type InquiryDetail,
} from "./components/inquiry-detail-sheet.component";
import { InquiryRow } from "./components/inquiry-row.component";
import { MessageListSkeleton } from "./components/message-list-skeleton.component";
import {
  dinerDisplayName,
  formatConversationWhen,
  formatInboxRelativeTime,
  formatUnreadSummary,
} from "./helpers/message-display.helpers";

type InboxFilter = "all" | "conversations" | "inquiries";

type Conversation = {
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

type Inquiry = InquiryDetail & {
  readAt?: string | null;
};

type InboxItem =
  | { kind: "conversation"; sortAt: string; conversation: Conversation }
  | { kind: "inquiry"; sortAt: string; inquiry: Inquiry };

type ConversationsQuery = { conversations: Conversation[] };
type InquiriesQuery = { restaurantInquiries: Inquiry[] };

export function MessagesFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const {
    activeRestaurant,
    loading: restaurantsLoading,
    restaurantsReady,
  } = useActiveRestaurant();
  const restaurantId = activeRestaurant?.id ?? null;
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const markedInquiryIds = useRef(new Set<string>());

  const {
    data: conversationsData,
    loading: conversationsLoading,
    error: conversationsError,
    refetch: refetchConversations,
  } = useQuery<ConversationsQuery>(CONVERSATIONS, {
    // Confirmed venue only — avoids stale MMKV ids (same pattern as Floor).
    skip: !restaurantId,
    variables: { restaurantId },
    fetchPolicy: "cache-and-network",
  });

  const {
    data: inquiriesData,
    loading: inquiriesLoading,
    error: inquiriesError,
    refetch: refetchInquiries,
  } = useQuery<InquiriesQuery>(RESTAURANT_INQUIRIES, {
    skip: !restaurantId,
    variables: { restaurantId },
    fetchPolicy: "cache-and-network",
  });

  const [markInquiryRead] = useMutation(MARK_RESTAURANT_INQUIRY_READ);

  const conversations = conversationsData?.conversations ?? [];
  const inquiries = inquiriesData?.restaurantInquiries ?? [];

  const inbox = useMemo(() => {
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
  }, [conversations, inquiries]);

  const visible = inbox.filter((item) => {
    if (filter === "conversations") return item.kind === "conversation";
    if (filter === "inquiries") return item.kind === "inquiry";
    return true;
  });

  const unreadConversations = conversations.filter(
    (item) => item.unreadCount > 0,
  ).length;
  const unreadInquiries = inquiries.filter((item) => !item.readAt).length;

  const isLoading =
    restaurantsLoading ||
    !restaurantsReady ||
    ((conversationsLoading || inquiriesLoading) &&
      !conversationsData &&
      !inquiriesData);

  useEffect(() => {
    const inquiry = selectedInquiry;
    if (
      !inquiry ||
      inquiry.readAt ||
      markedInquiryIds.current.has(inquiry.id)
    ) {
      return;
    }
    markedInquiryIds.current.add(inquiry.id);
    void markInquiryRead({ variables: { id: inquiry.id } })
      .then(() => refetchInquiries())
      .catch((err) => {
        markedInquiryIds.current.delete(inquiry.id);
        toast.error("Couldn't mark inquiry read", {
          description: getGraphQLErrorMessage(err, "Please try again"),
        });
      });
  }, [selectedInquiry, markInquiryRead, refetchInquiries]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([refetchConversations(), refetchInquiries()]);
    } finally {
      setRefreshing(false);
    }
  }

  const emptyCopy =
    filter === "conversations"
      ? {
          title: "No conversations",
          description: "Guest reservation messages will show up here.",
        }
      : filter === "inquiries"
        ? {
            title: "No inquiries",
            description: "Website inquiries will show up here.",
          }
        : {
            title: "No messages",
            description:
              "Guest conversations and website inquiries will show up here.",
          };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Typography weight="bold" size="text-xl">
          Messages
        </Typography>
        {!isLoading ? (
          <Typography size="text-sm" color="muted">
            {formatUnreadSummary(unreadConversations, unreadInquiries)}
          </Typography>
        ) : null}
        <SegmentedControl
          options={[
            { value: "all", label: "All" },
            { value: "conversations", label: "Conversations" },
            { value: "inquiries", label: "Inquiries" },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {conversationsError || inquiriesError ? (
        <View style={styles.pad}>
          <InlineAlert
            tone="error"
            message={
              conversationsError?.message ??
              inquiriesError?.message ??
              "Couldn't load messages"
            }
          />
        </View>
      ) : null}

      {isLoading ? (
        <MessageListSkeleton count={5} />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            visible.length === 0 && styles.contentEmpty,
            { paddingBottom: insets.bottom + theme.space(3) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void onRefresh();
              }}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        >
          {visible.length === 0 ? (
            <Empty
              icon={<MailIcon />}
              title={emptyCopy.title}
              description={emptyCopy.description}
            />
          ) : (
            <Flex gap={1}>
              {visible.map((item) => {
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
                        router.push(`/messages/${conversation.reservationId}`)
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
                    onPress={() => setSelectedInquiry(inquiry)}
                  />
                );
              })}
            </Flex>
          )}
        </ScrollView>
      )}

      <InquiryDetailSheet
        inquiry={selectedInquiry}
        visible={Boolean(selectedInquiry)}
        onClose={() => setSelectedInquiry(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
    gap: space(1.25),
  },
  pad: {
    paddingHorizontal: space(2),
    paddingBottom: space(1),
  },
  content: {
    paddingHorizontal: space(2),
  },
  contentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
}));
