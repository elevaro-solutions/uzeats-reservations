import { Circle, Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function CoinsIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Circle cx={8} cy={8} r={6} />
      <Path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <Path d="M7 6h1v4" />
      <Path d="m16.71 13.88.7.71-2.82 2.82" />
    </SvgWrapper>
  );
}
