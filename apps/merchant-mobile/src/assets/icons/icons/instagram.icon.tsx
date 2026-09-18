import { Line, Path, Rect } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

/** Lucide `instagram` — rounded square, lens, and corner flash. */
export function InstagramIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Rect width={20} height={20} x={2} y={2} rx={5} ry={5} />
      <Path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <Line x1={17.5} x2={17.51} y1={6.5} y2={6.5} />
    </SvgWrapper>
  );
}
