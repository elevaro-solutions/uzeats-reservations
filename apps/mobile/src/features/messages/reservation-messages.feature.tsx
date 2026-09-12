import { useMutation, useQuery } from "@apollo/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { MESSAGES, SEND_MESSAGE, useAuth } from "@/graphql";
import {
  getGraphQLErrorMessage,
  isUnauthenticatedError,
} from "@/lib/graphql-errors";

import { MY_RESERVATION } from "../booking/api/booking.operations";
import { formatReservationWhen } from "../reservations/helpers/reservation-display.helpers";
import { MessageBubble } from "./components/message-bubble.component";
import { MessageInput } from "./components/message-input.component";
import {
  formatMessageDayLabel,
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

export function ReservationMessagesFeature() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<MessageItem>>(null);

  const { data: reservationData, loading: reservationLoading } =
    useQuery<ReservationMetaQuery>(MY_RESERVATION, {
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
        refetchQueries: [{ query: MESSAGES, variables: { reservationId: id } }],
      });
      setDraft("");
      await refetch();
    } catch (err) {
      toast.error("Couldn't send", {
        description: getGraphQLErrorMessage(err, "Could not send message"),
      });
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
            {restaurantName}
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
          {!user || isUnauthenticatedError(error) ? (
            <Empty
              icon={<MailIcon />}
              title="Sign in to view messages"
              description="Sign in to your account to message the restaurant."
            >
              <Button
                onPress={() =>
                  router.push({
                    pathname: "/sign-in",
                    params: {
                      next: id
                        ? `/reservations/${id}/messages`
                        : "/reservations",
                    },
                  })
                }
              >
                Sign in
              </Button>
            </Empty>
          ) : (
            <Empty
              icon={<MailIcon />}
              title="Couldn't load messages"
              description="Check your connection and try again."
            >
              <Button variant="outlined" onPress={() => void refetch()}>
                Retry
              </Button>
            </Empty>
          )}
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
          placeholder={`Message ${restaurantName}…`}
          sending={sending}
          onSend={() => void onSend()}
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
