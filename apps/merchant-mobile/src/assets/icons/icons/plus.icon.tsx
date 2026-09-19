import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function PlusIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M5 12h14" />
      <Path d="M12 5v14" />
    </SvgWrapper>
  );
}
