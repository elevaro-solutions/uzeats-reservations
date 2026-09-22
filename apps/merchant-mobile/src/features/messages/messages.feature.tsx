import { useMutation, useQuery } from "@apollo/client";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { InlineAlert, SegmentedControl, Typography } from "@/components";
import { useActiveRestaurant } from "@/features/restaurants";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

import {
  CONVERSATIONS,
  MARK_RESTAURANT_INQUIRY_READ,
  RESTAURANT_INQUIRIES,
} from "./api/messages.operations";
import {
  InquiryDetailSheet,
} from "./components/inquiry-detail-sheet.component";
import { MessageListSkeleton } from "./components/message-list-skeleton.component";
import { MessagesInboxList } from "./components/messages-inbox-list.component";
import { formatUnreadSummary } from "./helpers/message-display.helpers";
import {
  countUnreadConversations,
  countUnreadInquiries,
  filterInboxItems,
  inboxEmptyCopy,
  mergeInboxItems,
  type Conversation,
  type InboxFilter,
  type Inquiry,
} from "./helpers/messages-inbox.helpers";

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

  const inbox = useMemo(
    () => mergeInboxItems(conversations, inquiries),
    [conversations, inquiries],
  );
  const visible = useMemo(
    () => filterInboxItems(inbox, filter),
    [inbox, filter],
  );
  const emptyCopy = inboxEmptyCopy(filter);
  const unreadConversations = countUnreadConversations(conversations);
  const unreadInquiries = countUnreadInquiries(inquiries);

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
        <MessagesInboxList
          items={visible}
          emptyTitle={emptyCopy.title}
          emptyDescription={emptyCopy.description}
          contentPaddingBottom={insets.bottom + theme.space(3)}
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
          onPressConversation={(reservationId) =>
            router.push(`/messages/${reservationId}`)
          }
          onPressInquiry={setSelectedInquiry}
        />
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
}));
