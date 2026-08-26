import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

/** Lucide sliders-horizontal */
export function SlidersHorizontalIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M10 5H3" />
      <Path d="M12 19H3" />
      <Path d="M14 3v4" />
      <Path d="M16 17v4" />
      <Path d="M21 12h-9" />
      <Path d="M21 19h-5" />
      <Path d="M21 5h-7" />
      <Path d="M8 10v4" />
      <Path d="M8 12H3" />
    </SvgWrapper>
  );
}
