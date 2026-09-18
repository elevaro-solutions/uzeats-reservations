import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function ChevronRightIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="m9 18 6-6-6-6" />
    </SvgWrapper>
  );
}
