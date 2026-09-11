import { useMutation, useQuery } from "@apollo/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChevronLeftIcon, MailIcon, SendIcon } from "@/assets";
import {
  Button,
  Empty,
  Flex,
  IconButton,
  Input,
  Loader,
  Typography,
} from "@/components";
import { MESSAGES, SEND_MESSAGE } from "@/graphql";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

import { MY_RESERVATION } from "../booking/api/booking.operations";
import { formatReservationWhen } from "../reservations/helpers/reservation-display.helpers";
import {
  formatMessageDayLabel,
  formatMessageTime,
  getMessageDayKey,
} from "./helpers/message-display.helpers";

type MessageItem = {
  id: string;
  senderType: string;
  body: string;
  createdAt: string;
};

type MessagesQuery = {
  messages: MessageItem[];
};

type ReservationMetaQuery = {
  myReservation: {
    id: string;
    slotStart: string;
    partySize: number;
    restaurant?: { name?: string | null } | null;
  } | null;
};

function MessageBubble({
  body,
  createdAt,
  mine,
}: {
  body: string;
  createdAt: string;
  mine: boolean;
}) {
  const [isMultiline, setIsMultiline] = useState(false);

  return (
    <View
      style={[
        styles.bubble,
        mine ? styles.bubbleMine : styles.bubbleTheirs,
        isMultiline ? styles.bubbleStacked : styles.bubbleInline,
      ]}
    >
      <Typography
        size="text-sm"
        color={mine ? "inverse" : "textPrimary"}
        style={isMultiline ? undefined : styles.bubbleBodyInline}
        onTextLayout={(event) => {
          if (event.nativeEvent.lines.length > 1) {
            setIsMultiline(true);
          }
        }}
      >
        {body}
      </Typography>
      <Typography
        size="text-xs"
        color={mine ? "inverse" : "muted"}
        style={styles.bubbleTime}
      >
        {formatMessageTime(createdAt)}
      </Typography>
    </View>
  );
}

export function ReservationMessagesFeature() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<MessageItem>>(null);

  const {
    data: reservationData,
    loading: reservationLoading,
  } = useQuery<ReservationMetaQuery>(MY_RESERVATION, {
    variables: { id },
    skip: !id,
    fetchPolicy: "cache-first",
  });

  const { data, loading, error, refetch } = useQuery<MessagesQuery>(MESSAGES, {
    variables: { reservationId: id },
    skip: !id,
    pollInterval: 5000,
    fetchPolicy: "network-only",
  });

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE);
  const messages = data?.messages ?? [];
  const reservation = reservationData?.myReservation;
  const restaurantName = reservation?.restaurant?.name ?? "Restaurant";

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages.length]);

  async function onSend() {
    const body = draft.trim();
    if (!body || !id) return;
    try {
      await sendMessage({
        variables: { reservationId: id, body },
        refetchQueries: [
          { query: MESSAGES, variables: { reservationId: id } },
        ],
      });
      setDraft("");
      await refetch();
    } catch (err) {
      Alert.alert(
        "Couldn't send",
        getGraphQLErrorMessage(err, "Could not send message"),
      );
    }
  }

  const subtitle = reservation
    ? [
        formatReservationWhen(reservation.slotStart),
        `party of ${reservation.partySize}`,
      ].join(" · ")
    : null;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <Flex direction="row" alignItems="center" gap={1} style={styles.topBar}>
        <IconButton
          icon={<ChevronLeftIcon />}
          variant="surface"
          size="sm"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          style={styles.chromeBtn}
        />
        <Flex style={styles.topCopy} gap={0.25}>
          <Typography weight="semibold" size="text-lg" numberOfLines={1}>
            {restaurantName}
          </Typography>
          {subtitle ? (
            <Typography size="text-xs" color="muted" numberOfLines={1}>
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
            reservationLoading ? null : (
              <Empty
                icon={<MailIcon />}
                title="No messages yet"
                description="Say hello to the restaurant about your visit."
              />
            )
          }
          renderItem={({ item, index }) => {
            const mine = item.senderType === "diner";
            const dayKey = getMessageDayKey(item.createdAt);
            const prevDayKey =
              index > 0
                ? getMessageDayKey(messages[index - 1].createdAt)
                : null;
            const showDayDivider = dayKey !== prevDayKey;

            return (
              <View style={styles.messageBlock}>
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
                />
              </View>
            );
          }}
        />
      )}

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
            placeholder={`Message ${restaurantName}…`}
            multiline
            numberOfLines={2}
          />
        </View>
        <Button
          size="lg"
          radius="rounded"
          loading={sending}
          disabled={!draft.trim()}
          onPress={() => void onSend()}
          startIcon={<SendIcon />}
        />
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
    paddingBottom: space(1),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    gap: space(0.75),
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  messageBlock: {
    gap: space(0.75),
  },
  dayDivider: {
    alignItems: "center",
    paddingVertical: space(0.5),
  },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: space(1.5),
    paddingVertical: space(1),
    borderRadius: radius.lg,
  },
  bubbleInline: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space(1),
  },
  bubbleStacked: {
    flexDirection: "column",
    gap: space(0.25),
  },
  bubbleBodyInline: {
    flexShrink: 1,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary5,
    borderBottomRightRadius: radius.sm,
  },
  bubbleTheirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.slate3,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleTime: {
    alignSelf: "flex-end",
    textAlign: "right",
    flexShrink: 0,
    opacity: 0.72,
  },
  composer: {
    paddingHorizontal: space(2),
    paddingTop: space(1),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  inputWrap: {
    flex: 1,
    minWidth: 0,
  },
}));
