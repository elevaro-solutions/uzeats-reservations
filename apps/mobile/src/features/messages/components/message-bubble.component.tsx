import { useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Typography } from "@/components";

import { formatMessageTime } from "../helpers/message-display.helpers";

export type MessageBubbleProps = {
  body: string;
  createdAt: string;
  mine: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
};

const ROUND = 16; // radius.lg
const CLUSTER = 8; // radius.sm
/** How far the tip sticks out past the bubble edge. */
const TIP_W = 7;
/** How far up the side wall the tip curve begins. */
const TIP_H = 10;

function corner(first: boolean, last: boolean, side: "left" | "right") {
  const top = first ? ROUND : CLUSTER;
  const bottom = last ? 0 : CLUSTER;
  if (side === "right") {
    return {
      topRight: top,
      bottomRight: bottom,
      topLeft: ROUND,
      bottomLeft: ROUND,
    };
  }
  return {
    topLeft: top,
    bottomLeft: bottom,
    topRight: ROUND,
    bottomRight: ROUND,
  };
}

/**
 * Single path for bubble + Telegram-style tip so the side wall flows into the beak.
 * Tip: flat bottom flush with bubble, concave outer curve to a point.
 */
function buildBubblePath(
  width: number,
  height: number,
  mine: boolean,
  withTip: boolean,
  isFirst: boolean,
  isLast: boolean,
): { d: string; svgW: number; svgH: number } {
  const c = corner(isFirst, isLast, mine ? "right" : "left");
  const tip = withTip ? TIP_W : 0;
  const svgW = width + tip;
  const svgH = height;

  // Draw in “outgoing” coordinates (tip on the right), then mirror for incoming.
  const tl = c.topLeft;
  const tr = c.topRight;
  const br = c.bottomRight;
  const bl = c.bottomLeft;

  let d: string;

  if (withTip && mine) {
    d = [
      `M${tl} 0`,
      `H${width - tr}`,
      `Q${width} 0 ${width} ${tr}`,
      `V${height - TIP_H}`,
      // Side wall → tip: concave swoop, flat bottom through the tip point.
      `C${width + TIP_W * 0.1} ${height - TIP_H * 0.55} ${width + TIP_W * 0.55} ${height - 1} ${width + TIP_W} ${height}`,
      `H${bl}`,
      `Q0 ${height} 0 ${height - bl}`,
      `V${tl}`,
      `Q0 0 ${tl} 0`,
      "Z",
    ].join(" ");
  } else if (withTip && !mine) {
    d = [
      `M${TIP_W + tl} 0`,
      `H${svgW - tr}`,
      `Q${svgW} 0 ${svgW} ${tr}`,
      `V${height - br}`,
      `Q${svgW} ${height} ${svgW - br} ${height}`,
      // Flat bottom out to the tip point on the left.
      `H0`,
      // Tip → left wall: mirrored concave swoop.
      `C${TIP_W * 0.45} ${height - 1} ${TIP_W * 0.9} ${height - TIP_H * 0.55} ${TIP_W} ${height - TIP_H}`,
      `V${tl}`,
      `Q${TIP_W} 0 ${TIP_W + tl} 0`,
      "Z",
    ].join(" ");
  } else {
    // No tip — plain rounded rect.
    d = [
      `M${tl} 0`,
      `H${width - tr}`,
      `Q${width} 0 ${width} ${tr}`,
      `V${height - br}`,
      `Q${width} ${height} ${width - br} ${height}`,
      `H${bl}`,
      `Q0 ${height} 0 ${height - bl}`,
      `V${tl}`,
      `Q0 0 ${tl} 0`,
      "Z",
    ].join(" ");
  }

  return { d, svgW, svgH };
}

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

  const fill = mine ? theme.colors.primary5 : theme.colors.slate3;
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
    <View
      style={[styles.wrap, mine ? styles.wrapMine : styles.wrapTheirs]}
    >
      {d ? (
        <Svg
          width={svgW}
          height={svgH}
          style={[
            styles.bubbleSvg,
            // Keep bubble bodies aligned: tip draws into the left gutter.
            !mine ? { left: showTip ? 0 : TIP_W } : null,
          ]}
        >
          <Path d={d} fill={fill} />
        </Svg>
      ) : null}

      <View
        style={[
          styles.content,
          // Always reserve tip width on incoming so grouped messages share one left edge.
          !mine ? { marginLeft: TIP_W } : null,
          size.width === 0
            ? { backgroundColor: fill, borderRadius: ROUND }
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
