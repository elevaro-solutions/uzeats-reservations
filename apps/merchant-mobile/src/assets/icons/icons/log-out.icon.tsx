import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function LogOutIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="m16 17 5-5-5-5" />
      <Path d="M21 12H9" />
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </SvgWrapper>
  );
}
