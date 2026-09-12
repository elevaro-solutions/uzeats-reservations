import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function ArrowUpIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="m5 12 7-7 7 7" />
      <Path d="M12 19V5" />
    </SvgWrapper>
  );
}
