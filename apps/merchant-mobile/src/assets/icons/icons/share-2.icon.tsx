import { Circle, Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function Share2Icon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Circle cx={18} cy={5} r={3} />
      <Circle cx={6} cy={12} r={3} />
      <Circle cx={18} cy={19} r={3} />
      <Path d="m8.59 13.51 6.83 3.98" />
      <Path d="M15.41 6.51 8.59 10.49" />
    </SvgWrapper>
  );
}
