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

import { MailIcon } from "@/assets";
import { Button, Empty, Flex, Loader } from "@/components";
import {
  syncActiveRestaurantId,
  useActiveRestaurant,
} from "@/features/restaurants";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";
import { PLATFORM_TIMEZONE } from "@reservations/shared";

import {
  CONVERSATION,
  MARK_CONVERSATION_READ,
  MESSAGES,
  SEND_MESSAGE,
} from "./api/messages.operations";
import { MessageInput } from "./components/message-input.component";
import { MessageThreadHeader } from "./components/message-thread-header.component";
import {
  MessageThreadListItem,
  type ThreadMessage,
} from "./components/message-thread-list-item.component";
import {
  dinerDisplayName,
  formatConversationWhen,
} from "./helpers/message-display.helpers";

type MessagesQuery = { messages: ThreadMessage[] };

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
  const { restaurants, activeRestaurant } = useActiveRestaurant();
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<ThreadMessage>>(null);

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
  const venueRestaurant =
    restaurants.find((r) => r.id === conversation?.restaurantId) ??
    activeRestaurant;
  const timeZone = venueRestaurant?.timezone ?? PLATFORM_TIMEZONE;
  const guestName = dinerDisplayName(conversation?.diner);
  const slotStart = conversation?.reservation?.slotStart;
  const partySize = conversation?.reservation?.partySize;
  const subtitle = slotStart
    ? [
        formatConversationWhen(slotStart, timeZone),
        partySize ? `party of ${partySize}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

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
      await sendMessage({ variables: { reservationId, body } });
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
      <MessageThreadHeader
        guestName={guestName}
        subtitle={subtitle}
        paddingTop={insets.top}
        onBack={() => router.back()}
      />

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
          renderItem={({ item, index }) => (
            <MessageThreadListItem
              item={item}
              index={index}
              messages={messages}
            />
          )}
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

const styles = StyleSheet.create(({ space, colors }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
  composer: {
    paddingHorizontal: space(2),
    paddingTop: space(1),
    backgroundColor: colors.background,
  },
}));
