import { useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Typography } from "@/components";

import {
  buildBubblePath,
  MESSAGE_BUBBLE_TIP_W,
} from "../helpers/message-bubble-path.helpers";
import { formatMessageTime } from "../helpers/message-display.helpers";

export type MessageBubbleProps = {
  body: string;
  createdAt: string;
  mine: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
};

export function MessageBubble({
  body,
  createdAt,
  mine,
  isFirstInGroup,
  isLastInGroup,
}: MessageBubbleProps) {
  const { theme } = useUnistyles();
  const [isMultiline, setIsMultiline] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const round = theme.radius.lg;
  const cluster = theme.radius.sm;
  const fill = mine ? theme.colors.primary5 : theme.colors.secondarySubtle;
  const showTip = isLastInGroup;
  const { d, svgW, svgH } =
    size.width > 0
      ? buildBubblePath(
          size.width,
          size.height,
          mine,
          showTip,
          isFirstInGroup,
          isLastInGroup,
          round,
          cluster,
        )
      : { d: "", svgW: 0, svgH: 0 };

  function onLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) =>
      Math.abs(prev.width - width) > 0.5 || Math.abs(prev.height - height) > 0.5
        ? { width, height }
        : prev,
    );
  }

  return (
    <View style={[styles.wrap, mine ? styles.wrapMine : styles.wrapTheirs]}>
      {d ? (
        <Svg
          width={svgW}
          height={svgH}
          style={[
            styles.bubbleSvg,
            !mine ? { left: showTip ? 0 : MESSAGE_BUBBLE_TIP_W } : null,
          ]}
        >
          <Path d={d} fill={fill} />
        </Svg>
      ) : null}

      <View
        style={[
          styles.content,
          !mine ? { marginLeft: MESSAGE_BUBBLE_TIP_W } : null,
          size.width === 0
            ? { backgroundColor: fill, borderRadius: round }
            : null,
        ]}
        onLayout={onLayout}
      >
        <View style={isMultiline ? styles.bubbleStacked : styles.bubbleInline}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  wrap: {
    maxWidth: "78%",
    position: "relative",
    overflow: "visible",
  },
  wrapMine: {
    alignSelf: "flex-end",
  },
  wrapTheirs: {
    alignSelf: "flex-start",
  },
  bubbleSvg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  content: {
    paddingHorizontal: space(1.5),
    paddingVertical: space(1),
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
  bubbleTime: {
    alignSelf: "flex-end",
    textAlign: "right",
    flexShrink: 0,
    opacity: 0.72,
  },
}));
