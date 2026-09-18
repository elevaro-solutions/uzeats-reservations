import { Path, Rect } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function CalendarPlusIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M8 2v4" />
      <Path d="M16 2v4" />
      <Rect width={18} height={18} x={3} y={4} rx={2} />
      <Path d="M3 10h18" />
      <Path d="M10 16h4" />
      <Path d="M12 14v4" />
    </SvgWrapper>
  );
}
