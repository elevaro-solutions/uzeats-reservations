import { Circle, Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function SearchIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M21 21l-4.34-4.34" />
      <Circle r={8} cx={11} cy={11} />
    </SvgWrapper>
  );
}
