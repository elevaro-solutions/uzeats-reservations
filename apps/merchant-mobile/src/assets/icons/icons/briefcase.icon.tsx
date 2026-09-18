import { Path, Rect } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function BriefcaseIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <Rect width={20} height={14} x={2} y={6} rx={2} />
    </SvgWrapper>
  );
}
