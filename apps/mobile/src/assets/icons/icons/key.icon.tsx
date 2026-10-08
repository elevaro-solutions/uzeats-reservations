import { Circle, Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function KeyIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Circle cx={7.5} cy={15.5} r={5.5} />
      <Path d="m21 2-9.6 9.6" />
      <Path d="m15.5 7.5 3 3L22 7l-3-3" />
    </SvgWrapper>
  );
}
