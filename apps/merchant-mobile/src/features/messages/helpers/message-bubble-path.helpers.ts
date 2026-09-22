/** How far the tip sticks out past the bubble edge. */
export const MESSAGE_BUBBLE_TIP_W = 7;
/** How far up the side wall the tip curve begins. */
export const MESSAGE_BUBBLE_TIP_H = 10;

export type BubbleCornerRadii = {
  topLeft: number;
  topRight: number;
  bottomLeft: number;
  bottomRight: number;
};

export function bubbleCornerRadii(
  first: boolean,
  last: boolean,
  side: "left" | "right",
  round: number,
  cluster: number,
): BubbleCornerRadii {
  const top = first ? round : cluster;
  const bottom = last ? 0 : cluster;
  if (side === "right") {
    return {
      topRight: top,
      bottomRight: bottom,
      topLeft: round,
      bottomLeft: round,
    };
  }
  return {
    topLeft: top,
    bottomLeft: bottom,
    topRight: round,
    bottomRight: round,
  };
}

/**
 * Single path for bubble + Telegram-style tip so the side wall flows into the beak.
 * Tip: flat bottom flush with bubble, concave outer curve to a point.
 */
export function buildBubblePath(
  width: number,
  height: number,
  mine: boolean,
  withTip: boolean,
  isFirst: boolean,
  isLast: boolean,
  round: number,
  cluster: number,
): { d: string; svgW: number; svgH: number } {
  const c = bubbleCornerRadii(
    isFirst,
    isLast,
    mine ? "right" : "left",
    round,
    cluster,
  );
  const tip = withTip ? MESSAGE_BUBBLE_TIP_W : 0;
  const svgW = width + tip;
  const svgH = height;

  const tl = c.topLeft;
  const tr = c.topRight;
  const br = c.bottomRight;
  const bl = c.bottomLeft;
  const tipW = MESSAGE_BUBBLE_TIP_W;
  const tipH = MESSAGE_BUBBLE_TIP_H;

  let d: string;

  if (withTip && mine) {
    d = [
      `M${tl} 0`,
      `H${width - tr}`,
      `Q${width} 0 ${width} ${tr}`,
      `V${height - tipH}`,
      `C${width + tipW * 0.1} ${height - tipH * 0.55} ${width + tipW * 0.55} ${height - 1} ${width + tipW} ${height}`,
      `H${bl}`,
      `Q0 ${height} 0 ${height - bl}`,
      `V${tl}`,
      `Q0 0 ${tl} 0`,
      "Z",
    ].join(" ");
  } else if (withTip && !mine) {
    d = [
      `M${tipW + tl} 0`,
      `H${svgW - tr}`,
      `Q${svgW} 0 ${svgW} ${tr}`,
      `V${height - br}`,
      `Q${svgW} ${height} ${svgW - br} ${height}`,
      `H0`,
      `C${tipW * 0.45} ${height - 1} ${tipW * 0.9} ${height - tipH * 0.55} ${tipW} ${height - tipH}`,
      `V${tl}`,
      `Q${tipW} 0 ${tipW + tl} 0`,
      "Z",
    ].join(" ");
  } else {
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
