import { Circle } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function MoreVerticalIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Circle cx={12} cy={12} r={1} />
      <Circle cx={12} cy={5} r={1} />
      <Circle cx={12} cy={19} r={1} />
    </SvgWrapper>
  );
}
