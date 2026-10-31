import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function TrashIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M3 6h18" />
      <Path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <Path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <Path d="M10 11v6" />
      <Path d="M14 11v6" />
    </SvgWrapper>
  );
}
