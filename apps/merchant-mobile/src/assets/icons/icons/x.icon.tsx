import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function XIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M18 6 6 18" />
      <Path d="m6 6 12 12" />
    </SvgWrapper>
  );
}
