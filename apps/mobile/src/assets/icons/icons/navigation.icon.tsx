import { Polygon } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function NavigationIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Polygon points="3 11 22 2 13 21 11 13 3 11" />
    </SvgWrapper>
  );
}
