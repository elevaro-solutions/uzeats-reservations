import { Path, Rect } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export type CalendarCheckIconProps = IconPropsType & {
  filled?: boolean;
};

export function CalendarCheckIcon({
  filled = false,
  ...props
}: CalendarCheckIconProps) {
  if (filled) {
    return (
      <SvgWrapper {...props} filled>
        <Path d="M7 3V2a1 1 0 012 0v1h6V2a1 1 0 112 0v1h2a3 3 0 013 3v14a3 3 0 01-3 3H5a3 3 0 01-3-3V6a3 3 0 013-3h2zm13 8H4v9a1 1 0 001 1h14a1 1 0 001-1v-9z" />
        <Path d="M15.707 13.293a1 1 0 00-1.414 0L11 16.586l-1.293-1.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 000-1.414z" />
      </SvgWrapper>
    );
  }

  return (
    <SvgWrapper {...props}>
      <Path d="M8 2v4" />
      <Path d="M16 2v4" />
      <Rect width={18} height={18} x={3} y={4} rx={2} />
      <Path d="M3 10h18" />
      <Path d="m9 16 2 2 4-4" />
    </SvgWrapper>
  );
}
