import { Path, Rect } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function MailIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
      <Rect x={2} y={4} width={20} height={16} rx={2} />
    </SvgWrapper>
  );
}
