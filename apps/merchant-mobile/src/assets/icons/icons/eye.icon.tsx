import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function EyeIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </SvgWrapper>
  );
}
