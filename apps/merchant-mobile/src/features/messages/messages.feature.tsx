import { useMutation, useQuery } from "@apollo/client";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import {
  Empty,
  Flex,
  InlineAlert,
  Loader,
  Typography,
} from "@/components";
import { useActiveRestaurant } from "@/features/restaurants";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";
import { formatSlotDateTime } from "@/lib/helpers/date-time.helpers";

import {
  CONVERSATIONS,
  MARK_RESTAURANT_INQUIRY_READ,
  RESTAURANT_INQUIRIES,
} from "./api/messages.operations";

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

type Inquiry = {
  id: string;
  senderName: string;
  senderEmail?: string | null;
  message: string;
  readAt?: string | null;
  createdAt: string;
};

type ConversationsQuery = { conversations: Conversation[] };
type InquiriesQuery = { restaurantInquiries: Inquiry[] };

function dinerName(diner?: {
  firstName?: string | null;
  lastName?: string | null;
} | null): string {
  return [diner?.firstName, diner?.lastName].filter(Boolean).join(" ") || "Guest";
}

export function MessagesFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { activeRestaurantId, loading: restaurantsLoading } =
    useActiveRestaurant();

  const {
    data: conversationsData,
    loading: conversationsLoading,
    error: conversationsError,
    refetch: refetchConversations,
  } = useQuery<ConversationsQuery>(CONVERSATIONS, {
    skip: !activeRestaurantId,
    variables: { restaurantId: activeRestaurantId },
    fetchPolicy: "cache-and-network",
  });

  const {
    data: inquiriesData,
    loading: inquiriesLoading,
    error: inquiriesError,
    refetch: refetchInquiries,
  } = useQuery<InquiriesQuery>(RESTAURANT_INQUIRIES, {
    skip: !activeRestaurantId,
    variables: { restaurantId: activeRestaurantId },
    fetchPolicy: "cache-and-network",
  });

  const [markInquiryRead] = useMutation(MARK_RESTAURANT_INQUIRY_READ);

  const conversations = conversationsData?.conversations ?? [];
  const inquiries = inquiriesData?.restaurantInquiries ?? [];
  const isLoading =
    restaurantsLoading ||
    ((conversationsLoading || inquiriesLoading) &&
      !conversationsData &&
      !inquiriesData);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Typography weight="bold" size="text-xl" style={styles.title}>
        Messages
      </Typography>

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
        <Loader fullScreen />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + theme.space(3) },
          ]}
        >
          <Typography weight="semibold" size="text-lg" style={styles.section}>
            Conversations
          </Typography>
          {conversations.length === 0 ? (
            <Empty
              title="No conversations"
              description="Guest reservation messages will show up here."
            />
          ) : (
            <Flex gap={1}>
              {conversations.map((item) => (
                <Pressable
                  key={item.reservationId}
                  onPress={() =>
                    router.push(`/messages/${item.reservationId}`)
                  }
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <Flex
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography weight="semibold" size="text-md" numberOfLines={1}>
                      {dinerName(item.diner)}
                    </Typography>
                    {item.unreadCount > 0 ? (
                      <View style={styles.badge}>
                        <Typography size="text-xs" weight="semibold" color="inverse">
                          {item.unreadCount}
                        </Typography>
                      </View>
                    ) : null}
                  </Flex>
                  <Typography size="text-sm" color="secondary" numberOfLines={1}>
                    {item.lastMessage?.body ?? "No messages yet"}
                  </Typography>
                  {item.reservation?.slotStart ? (
                    <Typography size="text-xs" color="muted">
                      {formatSlotDateTime(item.reservation.slotStart)}
                      {item.reservation.partySize
                        ? ` · party of ${item.reservation.partySize}`
                        : ""}
                    </Typography>
                  ) : null}
                </Pressable>
              ))}
            </Flex>
          )}

          <Typography weight="semibold" size="text-lg" style={styles.section}>
            Inquiries
          </Typography>
          {inquiries.length === 0 ? (
            <Typography color="secondary" size="text-sm">
              No website inquiries yet.
            </Typography>
          ) : (
            <Flex gap={1}>
              {inquiries.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    if (!item.readAt) {
                      void markInquiryRead({ variables: { id: item.id } })
                        .then(() => refetchInquiries())
                        .catch((err) => {
                          toast.error("Couldn't mark inquiry read", {
                            description: getGraphQLErrorMessage(
                              err,
                              "Please try again",
                            ),
                          });
                        });
                    }
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    !item.readAt && styles.unread,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <Typography weight="semibold" size="text-md">
                    {item.senderName}
                  </Typography>
                  <Typography size="text-sm" color="secondary" numberOfLines={3}>
                    {item.message}
                  </Typography>
                  {item.senderEmail ? (
                    <Typography size="text-xs" color="muted">
                      {item.senderEmail}
                    </Typography>
                  ) : null}
                </Pressable>
              ))}
            </Flex>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
  },
  pad: {
    paddingHorizontal: space(2),
  },
  content: {
    paddingHorizontal: space(2),
    gap: space(1),
  },
  section: {
    marginTop: space(1.5),
    marginBottom: space(0.5),
  },
  row: {
    padding: space(1.75),
    borderRadius: radius.md,
    backgroundColor: colors.slate2,
    gap: space(0.5),
    minHeight: space(8),
  },
  unread: {
    backgroundColor: colors.primary2,
  },
  rowPressed: {
    opacity: 0.85,
  },
  badge: {
    minWidth: space(2.5),
    paddingHorizontal: space(0.75),
    paddingVertical: space(0.25),
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
}));
