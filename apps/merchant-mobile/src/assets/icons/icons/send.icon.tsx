import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function SendIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
      <Path d="m21.854 2.146-10.94 10.939" />
    </SvgWrapper>
  );
}
