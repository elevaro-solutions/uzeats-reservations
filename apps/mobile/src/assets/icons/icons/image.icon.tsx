import { Circle, Path, Rect } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function ImageIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Rect width={18} height={18} x={3} y={3} rx={2} ry={2} />
      <Circle cx={9} cy={9} r={2} />
      <Path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </SvgWrapper>
  );
}
