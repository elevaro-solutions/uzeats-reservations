import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function ReceiptTextIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <Path d="M14 8H8" />
      <Path d="M16 12H8" />
      <Path d="M13 16H8" />
    </SvgWrapper>
  );
}
