import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Typography } from "@/components";

import { MessageBubble } from "./message-bubble.component";
import { getMessageGroupFlags } from "../helpers/message-day-group.helpers";
import { isRestaurantSender } from "../helpers/message-display.helpers";

export type ThreadMessage = {
  id: string;
  body: string;
  senderType: string;
  createdAt: string;
};

export type MessageThreadListItemProps = {
  item: ThreadMessage;
  index: number;
  messages: ThreadMessage[];
};

export function MessageThreadListItem({
  item,
  index,
  messages,
}: MessageThreadListItemProps) {
  const mine = isRestaurantSender(item.senderType);
  const { showDayDivider, dayLabel, isFirstInGroup, isLastInGroup } =
    getMessageGroupFlags(messages, index);

  return (
    <View
      style={[
        styles.messageBlock,
        isLastInGroup ? styles.messageGroupEnd : styles.messageGrouped,
      ]}
    >
      {showDayDivider ? (
        <View style={styles.dayDivider}>
          <Typography size="text-xs" color="muted" weight="medium">
            {dayLabel}
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
}

const styles = StyleSheet.create(({ space }) => ({
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
}));
