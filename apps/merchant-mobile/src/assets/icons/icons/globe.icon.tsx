import { Circle, Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function GlobeIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <Path d="M2 12h20" />
    </SvgWrapper>
  );
}
