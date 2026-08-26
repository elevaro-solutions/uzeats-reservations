import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function CircleAlertIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M12 16h.01" />
      <Path d="M12 8v4" />
      <Path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0" />
    </SvgWrapper>
  );
}
