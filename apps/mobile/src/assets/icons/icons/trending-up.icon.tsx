import { Path, Polyline } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function TrendingUpIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <Path d="M16 7h6v6" />
    </SvgWrapper>
  );
}
