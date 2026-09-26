import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function ShareIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <Path d="m16 6-4-4-4 4" />
      <Path d="M12 2v13" />
    </SvgWrapper>
  );
}
