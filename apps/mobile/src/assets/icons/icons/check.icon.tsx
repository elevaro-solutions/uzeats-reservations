import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function CheckIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M20 6 9 17l-5-5" />
    </SvgWrapper>
  );
}
