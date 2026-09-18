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

import { ChevronLeftIcon } from "@/assets";
import {
  Button,
  Empty,
  Flex,
  IconButton,
  Input,
  Loader,
  Typography,
} from "@/components";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

import {
  MARK_CONVERSATION_READ,
  MESSAGES,
  SEND_MESSAGE,
} from "./api/messages.operations";

type MessageItem = {
  id: string;
  body: string;
  senderType: string;
  createdAt: string;
};

type MessagesQuery = {
  messages: MessageItem[];
};

export function MessageThreadFeature() {
  const { reservationId } = useLocalSearchParams<{ reservationId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<MessageItem>>(null);

  const { data, loading, error, refetch } = useQuery<MessagesQuery>(MESSAGES, {
    variables: { reservationId },
    skip: !reservationId,
    pollInterval: 5_000,
    fetchPolicy: "network-only",
  });

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE);
  const [markRead] = useMutation(MARK_CONVERSATION_READ);

  const messages = data?.messages ?? [];

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
        description: getGraphQLErrorMessage(err, "Could not send message"),
      });
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Flex
        direction="row"
        alignItems="center"
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
        <Typography weight="semibold" size="text-lg" style={styles.topTitle}>
          Conversation
        </Typography>
        <View style={styles.chromeBtn} />
      </Flex>

      {loading && messages.length === 0 ? <Loader fullScreen /> : null}

      {!loading && error ? (
        <View style={styles.pad}>
          <Empty title="Couldn't load messages" description={error.message} />
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: theme.space(2),
          paddingBottom: theme.space(1),
          flexGrow: 1,
        }}
        ListEmptyComponent={
          !loading ? (
            <Empty
              title="No messages yet"
              description="Say hello to the guest."
            />
          ) : null
        }
        renderItem={({ item }) => {
          const fromRestaurant =
            item.senderType === "restaurant" ||
            item.senderType === "staff" ||
            item.senderType === "owner";
          return (
            <View
              style={[
                styles.bubble,
                fromRestaurant ? styles.bubbleOut : styles.bubbleIn,
              ]}
            >
              <Typography
                size="text-md"
                color={fromRestaurant ? "inverse" : "textPrimary"}
              >
                {item.body}
              </Typography>
            </View>
          );
        }}
      />

      <Flex
        direction="row"
        alignItems="flex-end"
        gap={1}
        style={[
          styles.composer,
          { paddingBottom: Math.max(insets.bottom, theme.space(1.5)) },
        ]}
      >
        <View style={styles.inputWrap}>
          <Input
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a message…"
            multiline
          />
        </View>
        <Button
          size="lg"
          disabled={!draft.trim()}
          loading={sending}
          onPress={() => {
            void onSend();
          }}
        >
          Send
        </Button>
      </Flex>
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
    paddingBottom: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
  },
  chromeBtn: {
    width: space(5),
    height: space(5),
    borderRadius: radius.full,
  },
  pad: {
    padding: space(2),
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: space(1.5),
    paddingVertical: space(1.25),
    borderRadius: radius.lg,
    marginBottom: space(1),
  },
  bubbleIn: {
    alignSelf: "flex-start",
    backgroundColor: colors.slate2,
  },
  bubbleOut: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
  },
  composer: {
    paddingHorizontal: space(2),
    paddingTop: space(1),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
  },
  inputWrap: {
    flex: 1,
  },
}));
