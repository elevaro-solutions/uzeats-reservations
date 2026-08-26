import Svg, { SvgProps } from "react-native-svg";
import { Children, cloneElement, ReactElement, ReactNode } from "react";
import { StyleSheet } from "react-native";

import { IconPropsType } from "@/types";

export function SvgWrapper({
  size,
  style,
  filled = false,
  color: defaultColor,
  children,
  ...props
}: IconPropsType & { filled?: boolean; children: ReactNode } & SvgProps) {
  const flattenedStyle = (StyleSheet.flatten(style) || {}) as {
    width?: number;
    height?: number;
    color?: string;
  };

  const width = size ?? flattenedStyle.width ?? 24;
  const height = size ?? flattenedStyle.height ?? 24;
  const color = defaultColor ?? flattenedStyle.color;

  return (
    <Svg
      width={width}
      style={style}
      height={height}
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={filled ? color : "none"}
      stroke={filled ? "none" : color}
      strokeWidth={props.strokeWidth ?? (filled ? 0 : 2)}
      {...props}
    >
      {Children.map(children, (child) => {
        if (!child || typeof child !== "object") return child;
        const element = child as ReactElement<{ fill?: string; stroke?: string }>;
        return cloneElement(element, {
          fill: filled ? (element.props.fill ?? color) : "none",
          stroke: filled ? "none" : (element.props.stroke ?? color),
        });
      })}
    </Svg>
  );
}
