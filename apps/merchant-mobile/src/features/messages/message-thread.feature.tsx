import { useMutation, useQuery } from "@apollo/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { ChevronLeftIcon, MailIcon } from "@/assets";
import {
  Button,
  Empty,
  Flex,
  IconButton,
  Loader,
  Typography,
} from "@/components";
import { useActiveRestaurant } from "@/features/restaurants";
import { syncActiveRestaurantId } from "@/features/restaurants/helpers/sync-active-restaurant.helpers";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

import {
  CONVERSATION,
  MARK_CONVERSATION_READ,
  MESSAGES,
  SEND_MESSAGE,
} from "./api/messages.operations";
import { MessageBubble } from "./components/message-bubble.component";
import { MessageInput } from "./components/message-input.component";
import {
  dinerDisplayName,
  formatConversationWhen,
  formatMessageDayLabel,
  getMessageDayKey,
  isRestaurantSender,
} from "./helpers/message-display.helpers";

type MessageItem = {
  id: string;
  body: string;
  senderType: string;
  createdAt: string;
};

type MessagesQuery = {
  messages: MessageItem[];
};

type ConversationQuery = {
  conversation: {
    restaurantId?: string | null;
    diner?: {
      firstName?: string | null;
      lastName?: string | null;
    } | null;
    reservation?: {
      slotStart?: string | null;
      partySize?: number | null;
    } | null;
  } | null;
};

export function MessageThreadFeature() {
  const { reservationId } = useLocalSearchParams<{ reservationId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { restaurants } = useActiveRestaurant();
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<MessageItem>>(null);

  const { data: conversationData } = useQuery<ConversationQuery>(CONVERSATION, {
    variables: { reservationId },
    skip: !reservationId,
    fetchPolicy: "cache-and-network",
  });

  const { data, loading, error, refetch } = useQuery<MessagesQuery>(MESSAGES, {
    variables: { reservationId },
    skip: !reservationId,
    pollInterval: 5_000,
    fetchPolicy: "network-only",
  });

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE);
  const [markRead] = useMutation(MARK_CONVERSATION_READ);

  const messages = data?.messages ?? [];
  const conversation = conversationData?.conversation;
  const guestName = dinerDisplayName(conversation?.diner);
  const slotStart = conversation?.reservation?.slotStart;
  const partySize = conversation?.reservation?.partySize;
  const subtitle = slotStart
    ? [
        formatConversationWhen(slotStart),
        partySize ? `party of ${partySize}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  // Inbox is venue-scoped; sync so Messages tab matches this thread (Partner Hub does the same).
  useEffect(() => {
    syncActiveRestaurantId(conversation?.restaurantId, { restaurants });
  }, [conversation?.restaurantId, restaurants]);

  useEffect(() => {
    if (!reservationId) return;
    void markRead({ variables: { reservationId } }).catch(() => undefined);
  }, [reservationId, markRead]);

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages.length]);

  async function onSend() {
    const body = draft.trim();
    if (!body || !reservationId) return;
    try {
      await sendMessage({
        variables: { reservationId, body },
      });
      setDraft("");
      await refetch();
    } catch (err) {
      toast.error("Couldn't send", {
        description: getGraphQLErrorMessage(err, "Please try again"),
      });
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <Flex
        direction="row"
        alignItems="center"
        gap={1}
        style={[styles.topBar, { paddingTop: insets.top }]}
      >
        <IconButton
          icon={<ChevronLeftIcon />}
          variant="surface"
          size="sm"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          style={styles.chromeBtn}
        />
        <Flex style={styles.topCopy} gap={0.25} alignItems="center">
          <Typography
            weight="semibold"
            size="text-lg"
            align="center"
            numberOfLines={1}
          >
            {guestName}
          </Typography>
          {subtitle ? (
            <Typography
              size="text-xs"
              color="muted"
              align="center"
              numberOfLines={1}
            >
              {subtitle}
            </Typography>
          ) : null}
        </Flex>
        <View style={styles.topSpacer} />
      </Flex>

      {loading && messages.length === 0 ? (
        <Flex flex={1} justifyContent="center" alignItems="center">
          <Loader />
        </Flex>
      ) : error && messages.length === 0 ? (
        <Flex flex={1} justifyContent="center" style={styles.centered}>
          <Empty
            icon={<MailIcon />}
            title="Couldn't load messages"
            description="Check your connection and try again."
          >
            <Button variant="outlined" onPress={() => void refetch()}>
              Retry
            </Button>
          </Empty>
        </Flex>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            messages.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={
            !loading ? (
              <Empty
                icon={<MailIcon />}
                title="No messages yet"
                description="Say hello to the guest."
              />
            ) : null
          }
          renderItem={({ item, index }) => {
            const mine = isRestaurantSender(item.senderType);
            const dayKey = getMessageDayKey(item.createdAt);
            const prev = index > 0 ? messages[index - 1] : null;
            const next =
              index < messages.length - 1 ? messages[index + 1] : null;
            const prevDayKey = prev ? getMessageDayKey(prev.createdAt) : null;
            const nextDayKey = next ? getMessageDayKey(next.createdAt) : null;
            const showDayDivider = dayKey !== prevDayKey;
            const isFirstInGroup =
              !prev ||
              prev.senderType !== item.senderType ||
              prevDayKey !== dayKey;
            const isLastInGroup =
              !next ||
              next.senderType !== item.senderType ||
              nextDayKey !== dayKey;

            return (
              <View
                style={[
                  styles.messageBlock,
                  isLastInGroup
                    ? styles.messageGroupEnd
                    : styles.messageGrouped,
                ]}
              >
                {showDayDivider ? (
                  <View style={styles.dayDivider}>
                    <Typography size="text-xs" color="muted" weight="medium">
                      {formatMessageDayLabel(item.createdAt)}
                    </Typography>
                  </View>
                ) : null}
                <MessageBubble
                  body={item.body}
                  createdAt={item.createdAt}
                  mine={mine}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                />
              </View>
            );
          }}
        />
      )}

      <View
        style={[
          styles.composer,
          { paddingBottom: Math.max(insets.bottom, theme.space(1.5)) },
        ]}
      >
        <MessageInput
          value={draft}
          onChangeText={setDraft}
          placeholder={`Message ${guestName}…`}
          sending={sending}
          onSend={() => {
            void onSend();
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: space(2),
    paddingBottom: space(1),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
  },
  chromeBtn: {
    width: space(5),
    height: space(5),
    borderRadius: radius.full,
  },
  topCopy: {
    flex: 1,
    minWidth: 0,
  },
  topSpacer: {
    width: space(5),
  },
  centered: {
    padding: space(2),
  },
  list: {
    paddingHorizontal: space(2),
    paddingVertical: space(1.5),
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  messageBlock: {
    gap: space(0.75),
  },
  messageGrouped: {
    marginBottom: space(0.25),
  },
  messageGroupEnd: {
    marginBottom: space(1.25),
  },
  dayDivider: {
    alignItems: "center",
    paddingVertical: space(0.5),
  },
  composer: {
    paddingHorizontal: space(2),
    paddingTop: space(1),
    backgroundColor: colors.background,
  },
}));
